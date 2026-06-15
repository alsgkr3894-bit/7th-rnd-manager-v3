'use client';
import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import {
  getAllSamples,
  addSample,
  updateSample,
  deleteSample,
  SAMPLE_CATEGORIES,
  sampleNamesText,
} from '@/lib/sample';
import { tryLS, setLS } from '@/lib/note/storage';
import { formatDate } from '@/lib/format';
import { KEYS } from '@/lib/note/keys';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useSampleBatchMode } from '@/hooks/useSampleBatchMode';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useSampleCompareMode } from '@/hooks/useSampleCompareMode';
import { CompareModal } from './_CompareModal';
import { SampleDetailModal } from './_SampleDetailModal';
import { SampleCalendarView } from './_SampleCalendarView';
import { SampleFilterControls } from './_SampleFilterControls';
import { SamplePageActions } from './_SamplePageActions';
import { SampleRecordsView } from './_SampleRecordsView';
import { buildCalendarDays } from '@/lib/note/calendar-utils';

const SORT_OPTIONS = [
  { key: 'createdAt', label: '최신순' },
  { key: 'testDate', label: '날짜순' },
  { key: 'rating', label: '별점순' },
];

const SAMPLE_SORT_KEYS = new Set(SORT_OPTIONS.map(o => o.key));
const SAMPLE_VIEW_KEYS = new Set(['grid', 'list', 'calendar']);
const SAMPLE_RATING_KEYS = new Set([-1, 0, 3, 4, 5]);

function pickAllowed(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

const CALENDAR_CELLS = 42; // 6주 × 7일 — 달력 그리드 고정 칸 수

/* ── 메인 페이지 ── */
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="main">
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>로딩 중…</div>
        </main>
      }
    >
      <SampleContent />
    </Suspense>
  );
}

function SampleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [samples, setSamples] = useState([]);
  const [search, setSearch] = useState('');
  const {
    history: searchHistory,
    isOpen: showSearchHist,
    setIsOpen: setShowSearchHist,
    scheduleAdd: scheduleSearchHistory,
  } = useSearchHistory(KEYS.SAMPLE_SEARCH_HISTORY);
  const [catFilter, setCatFilter] = useState(() => searchParams.get('cat') || 'all');
  const [ratingMin, setRatingMin] = useState(() => {
    const v = parseInt(searchParams.get('r') || '0', 10);
    return pickAllowed(v, SAMPLE_RATING_KEYS, 0);
  });
  const [sortBy, setSortBy] = useState(() =>
    pickAllowed(tryLS(KEYS.SAMPLE_SORT, 'createdAt'), SAMPLE_SORT_KEYS, 'createdAt')
  );
  const [detailRec, setDetailRec] = useState(null);
  const searchBlurTimerRef = useRef(null);

  // 뷰 모드
  const [viewMode, setViewMode] = useState(() =>
    pickAllowed(tryLS(KEYS.SAMPLE_VIEW, 'grid'), SAMPLE_VIEW_KEYS, 'grid')
  );
  const [calMonth, setCalMonth] = useState(() => new Date());

  const {
    data: loadedSamples,
    loading,
    error: loadError,
    reload,
  } = useDBLoad(() => getAllSamples());

  useEffect(() => {
    if (loadedSamples) setSamples(loadedSamples);
  }, [loadedSamples]);

  useVisibilityRefresh(reload);

  useEffect(
    () => () => {
      if (searchBlurTimerRef.current) clearTimeout(searchBlurTimerRef.current);
    },
    []
  );

  const {
    batchMode,
    setBatchMode,
    selected,
    toggleSelect,
    exitBatchMode,
    handleBatchDelete,
    confirmOpen,
    setConfirmOpen,
    confirmBatchDelete,
  } = useSampleBatchMode(ids => setSamples(prev => prev.filter(s => !ids.includes(s.id))), reload);

  const { showConfirm, confirmElement } = useConfirmDialog();

  const {
    compareMode,
    setCompareMode,
    compareSet,
    toggleCompare,
    showCompare,
    setShowCompare,
    compareItems,
    compareIdxMap,
    exitCompareMode,
  } = useSampleCompareMode(samples);

  // URL sync for filters
  useEffect(() => {
    const params = new URLSearchParams();
    if (catFilter !== 'all') params.set('cat', catFilter);
    if (ratingMin !== 0) params.set('r', String(ratingMin));
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [catFilter, ratingMin, pathname]);

  function handleSearchChange(val) {
    setSearch(val);
    scheduleSearchHistory(val);
  }

  function closeSearchHistorySoon() {
    if (searchBlurTimerRef.current) clearTimeout(searchBlurTimerRef.current);
    searchBlurTimerRef.current = setTimeout(() => {
      setShowSearchHist(false);
      searchBlurTimerRef.current = null;
    }, 150);
  }

  const filtered = useMemo(() => {
    let list = samples;
    if (catFilter !== 'all') list = list.filter(s => s.category === catFilter);
    if (ratingMin === -1) list = list.filter(s => !s.rating);
    else if (ratingMin > 0) list = list.filter(s => (s.rating || 0) >= ratingMin);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        s =>
          (s.title || '').toLowerCase().includes(q) ||
          sampleNamesText(s).toLowerCase().includes(q) ||
          (s.company || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q) ||
          (s.tags || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'testDate') return (b.testDate || '').localeCompare(a.testDate || '');
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [samples, catFilter, ratingMin, search, sortBy]);

  const catCounts = useMemo(() => {
    const m = { all: samples.length };
    for (const s of samples) m[s.category] = (m[s.category] || 0) + 1;
    return m;
  }, [samples]);

  // 별점 분포 (1~5별 + 별점 없음) — 필터칩 옆 요약 배지용
  const ratingDist = useMemo(() => {
    const d = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, none: 0 };
    for (const s of samples) {
      const r = s.rating || 0;
      if (r >= 1 && r <= 5) d[r] += 1;
      else d.none += 1;
    }
    return d;
  }, [samples]);

  async function handleDelete(rec) {
    const label = rec.title?.trim() || '샘플';
    const ok = await showConfirm({
      message: `'${label}' 기록이 삭제됩니다. 되돌릴 수 없습니다. 계속할까요?`,
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteSample(rec.id);
      setSamples(prev => prev.filter(s => s.id !== rec.id));
      setDetailRec(null);
      const label = rec.title?.trim() ? `"${rec.title}" 삭제됨` : '샘플 삭제됨';
      showToast(label, 'ok');
    } catch {
      showToast('삭제 실패', 'error');
    }
  }

  async function handleCopy(rec, e) {
    e?.stopPropagation();
    try {
      await initDB();
      await addSample({ ...rec, title: `${rec.title} (복사)` });
      showToast('샘플을 복사했어요', 'ok');
      reload();
    } catch {
      showToast('복사 실패', 'error');
    }
  }

  async function handleRatingChange(sampleId, newRating, e) {
    e?.stopPropagation();
    try {
      await initDB();
      await updateSample(sampleId, { rating: newRating });
      setSamples(prev => prev.map(s => (s.id === sampleId ? { ...s, rating: newRating } : s)));
      showToast('별점 수정됨', 'ok', 1500);
    } catch {
      showToast('별점 변경 실패', 'error');
    }
  }

  const calDays = useMemo(() => buildCalendarDays(calMonth, CALENDAR_CELLS), [calMonth]);

  const samplesByDate = useMemo(() => {
    const m = {};
    for (const s of samples) {
      if (s.testDate) (m[s.testDate] ??= []).push(s);
    }
    return m;
  }, [samples]);

  const today = formatDate(new Date());

  const headerActions = (
    <SamplePageActions
      filtered={filtered}
      batchMode={batchMode}
      compareMode={compareMode}
      selected={selected}
      onBatchDelete={handleBatchDelete}
      onExitBatchMode={exitBatchMode}
      onExitCompareMode={exitCompareMode}
      onStartBatchMode={() => setBatchMode(true)}
      onStartCompareMode={() => setCompareMode(true)}
      onCreateSample={() => router.push('/note/sample/write')}
    />
  );

  if (loadError) {
    return (
      <main className="main">
        <div
          className="card"
          style={{ padding: 32, textAlign: 'center', color: 'var(--negative)', marginTop: 32 }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>데이터 로드 실패</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
            {loadError.message || String(loadError)}
          </div>
          <button className="btn primary" onClick={reload}>
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['샘플기록']}
        title="샘플기록"
        sub={`총 ${samples.length}개 샘플`}
        actions={headerActions}
      />

      <SampleFilterControls
        categories={SAMPLE_CATEGORIES}
        catCounts={catCounts}
        catFilter={catFilter}
        onCatFilterChange={setCatFilter}
        ratingMin={ratingMin}
        onRatingMinChange={setRatingMin}
        ratingDist={ratingDist}
        sampleCount={samples.length}
        sortOptions={SORT_OPTIONS}
        sortBy={sortBy}
        onSortChange={key => {
          setSortBy(key);
          setLS(KEYS.SAMPLE_SORT, key);
        }}
        viewMode={viewMode}
        onViewModeChange={mode => {
          setViewMode(mode);
          setLS(KEYS.SAMPLE_VIEW, mode);
        }}
        search={search}
        onSearchChange={handleSearchChange}
        showSearchHist={showSearchHist}
        onSearchFocus={() => setShowSearchHist(true)}
        onSearchBlur={closeSearchHistorySoon}
        searchHistory={searchHistory}
        onSelectSearchHistory={value => {
          handleSearchChange(value);
          setShowSearchHist(false);
        }}
      />

      {!loading && viewMode === 'calendar' && (
        <SampleCalendarView
          days={calDays}
          calMonth={calMonth}
          samplesByDate={samplesByDate}
          today={today}
          onPrevMonth={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          onNextMonth={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          onOpenSample={setDetailRec}
        />
      )}

      <SampleRecordsView
        loading={loading}
        viewMode={viewMode}
        filtered={filtered}
        catFilter={catFilter}
        ratingMin={ratingMin}
        sortBy={sortBy}
        search={search}
        batchMode={batchMode}
        selected={selected}
        toggleSelect={toggleSelect}
        compareMode={compareMode}
        toggleCompare={toggleCompare}
        compareIdxMap={compareIdxMap}
        onOpenSample={setDetailRec}
        onEditSample={sample => router.push(`/note/sample/${sample.id}`)}
        onCopySample={handleCopy}
        onDeleteSample={handleDelete}
        onRatingChange={handleRatingChange}
        onCreateSample={() => router.push('/note/sample/write')}
      />

      {/* 비교 모드 하단 바 */}
      {compareMode && compareSet.size >= 2 && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--accent)',
            color: 'var(--surface)',
            borderRadius: 40,
            padding: '12px 28px',
            fontWeight: 800,
            fontSize: 15,
            boxShadow: 'var(--shadow-lg)',
            cursor: 'pointer',
            zIndex: 200,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
          onClick={() => setShowCompare(true)}
        >
          {compareSet.size}개 비교하기
        </div>
      )}

      {/* 상세 모달 */}
      {detailRec && (
        <SampleDetailModal
          sample={detailRec}
          onClose={() => setDetailRec(null)}
          onEdit={() => {
            setDetailRec(null);
            router.push(`/note/sample/${detailRec.id}`);
          }}
          onDelete={() => handleDelete(detailRec)}
        />
      )}

      {/* 비교 모달 */}
      {showCompare && compareItems.length >= 2 && (
        <CompareModal samples={compareItems} onClose={() => setShowCompare(false)} />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`샘플 ${selected.size}개를 삭제할까요?`}
        message="삭제한 샘플은 목록에서 제거됩니다."
        confirmLabel="삭제"
        danger
        onConfirm={confirmBatchDelete}
        onCancel={() => setConfirmOpen(false)}
      />
      {confirmElement}
    </main>
  );
}
