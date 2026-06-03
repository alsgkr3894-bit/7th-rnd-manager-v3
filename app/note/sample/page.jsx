'use client';
import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { SampleCardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import {
  getAllSamples,
  addSample,
  updateSample,
  deleteSample,
  SAMPLE_CATEGORIES,
  RATING_COLOR,
  sampleNamesText,
} from '@/lib/sample';
import { tryLS, setLS } from '@/lib/note/storage';
import { formatDate } from '@/lib/format';
import { KEYS } from '@/lib/note/keys';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useSampleBatchMode } from '@/hooks/useSampleBatchMode';
import { useSampleCompareMode } from '@/hooks/useSampleCompareMode';
import { Stars } from './_Stars';
import { CompareModal } from './_CompareModal';
import { SampleDetailModal } from './_SampleDetailModal';
import { SampleCard } from '@/components/note/SampleCard';
import { SampleListRow } from '@/components/note/SampleListRow';

const SORT_OPTIONS = [
  { key: 'createdAt', label: '최신순' },
  { key: 'testDate', label: '날짜순' },
  { key: 'rating', label: '별점순' },
];

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
    return Number.isNaN(v) ? 0 : v;
  });
  const [sortBy, setSortBy] = useState(() => tryLS(KEYS.SAMPLE_SORT, 'createdAt'));
  const [detailRec, setDetailRec] = useState(null);

  // 뷰 모드
  const [viewMode, setViewMode] = useState(() => tryLS(KEYS.SAMPLE_VIEW, 'grid'));
  const [calMonth, setCalMonth] = useState(() => new Date());

  const { data: loadedSamples, loading, reload } = useDBLoad(() => getAllSamples());

  useEffect(() => {
    if (loadedSamples) setSamples(loadedSamples);
  }, [loadedSamples]);

  useVisibilityRefresh(reload);

  const { batchMode, setBatchMode, selected, toggleSelect, exitBatchMode, handleBatchDelete } =
    useSampleBatchMode(ids => setSamples(prev => prev.filter(s => !ids.includes(s.id))), reload);

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
    if (ratingMin > 0) params.set('r', String(ratingMin));
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [catFilter, ratingMin, pathname]);

  function handleSearchChange(val) {
    setSearch(val);
    scheduleSearchHistory(val);
  }

  const filtered = useMemo(() => {
    let list = samples;
    if (catFilter !== 'all') list = list.filter(s => s.category === catFilter);
    if (ratingMin > 0) list = list.filter(s => (s.rating || 0) >= ratingMin);
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

  async function handleDelete(rec) {
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

  // 캘린더 헬퍼 — calMonth가 바뀔 때만 재계산
  const calDays = useMemo(() => {
    const month = calMonth;
    const year = month.getFullYear();
    const mon = month.getMonth();
    const first = new Date(year, mon, 1);
    const last = new Date(year, mon + 1, 0);
    const startDow = first.getDay();
    const days = [];
    for (let i = 0; i < startDow; i++) {
      days.push({ date: new Date(year, mon, -startDow + i + 1), cur: false });
    }
    for (let d = 1; d <= last.getDate(); d++) {
      days.push({ date: new Date(year, mon, d), cur: true });
    }
    const rem = CALENDAR_CELLS - days.length;
    for (let d = 1; d <= rem; d++) {
      days.push({ date: new Date(year, mon + 1, d), cur: false });
    }
    return days;
  }, [calMonth]);

  const samplesByDate = useMemo(() => {
    const m = {};
    for (const s of samples) {
      if (s.testDate) (m[s.testDate] ??= []).push(s);
    }
    return m;
  }, [samples]);

  const today = formatDate(new Date());

  /* ── Actions for PageHeader ── */
  const headerActions = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {!batchMode && !compareMode && (
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 17,
            padding: '4px 6px',
            borderRadius: 8,
            color: 'var(--text-2)',
          }}
          onClick={() => window.print()}
          title="인쇄"
        >
          🖨
        </button>
      )}
      {batchMode ? (
        <>
          <button
            className="btn sm"
            style={{ color: 'var(--negative)', fontWeight: 700 }}
            onClick={handleBatchDelete}
          >
            선택 삭제 ({selected.size})
          </button>
          <button className="btn sm" onClick={exitBatchMode}>
            취소
          </button>
        </>
      ) : compareMode ? (
        <>
          <button className="btn sm" onClick={exitCompareMode}>
            비교 취소
          </button>
        </>
      ) : (
        <>
          <button className="btn sm" onClick={() => setBatchMode(true)}>
            선택
          </button>
          <button className="btn sm" onClick={() => setCompareMode(true)}>
            비교
          </button>
          <button className="btn primary" onClick={() => router.push('/note/sample/write')}>
            <Icon.plus style={{ width: 14, height: 14 }} /> 새 샘플 작성
          </button>
        </>
      )}
    </div>
  );

  const days = calDays;

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['샘플기록']}
        title="샘플기록"
        sub={`총 ${samples.length}개 샘플`}
        actions={headerActions}
      />

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, marginBottom: 8 }}>
        {[{ key: 'all', label: '전체' }, ...SAMPLE_CATEGORIES.map(c => ({ key: c, label: c }))].map(
          ({ key, label }) => (
            <button
              key={key}
              className={'chip' + (catFilter === key ? ' active' : '')}
              onClick={() => setCatFilter(key)}
            >
              {label}
              {catCounts[key] > 0 && (
                <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>
                  {catCounts[key] || 0}
                </span>
              )}
            </button>
          )
        )}
      </div>

      {/* 별점 필터 + 정렬 + 뷰 토글 */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { min: 0, label: '전체' },
            { min: 3, label: '★3이상' },
            { min: 4, label: '★4이상' },
            { min: 5, label: '★5' },
          ].map(({ min, label }) => (
            <button
              key={min}
              className={'chip' + (ratingMin === min ? ' active' : '')}
              style={{ fontSize: 11 }}
              onClick={() => setRatingMin(min)}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              className={'chip' + (sortBy === key ? ' active' : '')}
              style={{ fontSize: 11 }}
              onClick={() => {
                setSortBy(key);
                setLS(KEYS.SAMPLE_SORT, key);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        {/* 뷰 토글 */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { v: 'grid', label: '갤러리' },
            { v: 'list', label: '리스트' },
            { v: 'calendar', label: '캘린더' },
          ].map(({ v, label }) => (
            <button
              key={v}
              className={'chip' + (viewMode === v ? ' active' : '')}
              style={{ fontSize: 11 }}
              onClick={() => {
                setViewMode(v);
                setLS(KEYS.SAMPLE_VIEW, v);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 검색 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Icon.search
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 14,
              height: 14,
              color: 'var(--text-3)',
            }}
          />
          <input
            className="form-input filter-search"
            style={{ paddingLeft: 32 }}
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => setShowSearchHist(true)}
            onBlur={() => {
              setTimeout(() => setShowSearchHist(false), 150);
            }}
            placeholder="제목, 메뉴명, 내용, 태그 검색"
          />
          {showSearchHist && searchHistory.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '0 0 10px 10px',
                zIndex: 50,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {searchHistory.map((h, i) => (
                <button
                  key={i}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 14px',
                    fontSize: 13,
                    color: 'var(--text-2)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  onMouseDown={e => {
                    e.preventDefault();
                    handleSearchChange(h);
                    setShowSearchHist(false);
                  }}
                >
                  🕐 {h}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 스켈레톤 로딩 */}
      {loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <SampleCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ── 캘린더 뷰 ── */}
      {!loading && viewMode === 'calendar' && (
        <div className="tab-content-enter">
          {/* 월 네비게이션 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <button
              className="btn sm"
              onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <div
              style={{
                fontWeight: 800,
                fontSize: 15,
                color: 'var(--text-1)',
                minWidth: 100,
                textAlign: 'center',
              }}
            >
              {calMonth.getFullYear()}년 {calMonth.getMonth() + 1}월
            </div>
            <button
              className="btn sm"
              onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            >
              ›
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="cal-grid" style={{ marginBottom: 4 }}>
            {['일', '월', '화', '수', '목', '금', '토'].map(d => (
              <div
                key={d}
                style={{
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-3)',
                  padding: '4px 0',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="cal-grid">
            {days.map(({ date, cur }, idx) => {
              const ymd = formatDate(date);
              const daySamples = samplesByDate[ymd] || [];
              const isToday = ymd === today;
              return (
                <div
                  key={idx}
                  className={'cal-cell' + (!cur ? ' other-month' : '') + (isToday ? ' today' : '')}
                  style={{ cursor: daySamples.length > 0 ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (daySamples.length > 0) setDetailRec(daySamples[0]);
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 400 }}>
                    {date.getDate()}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                    {daySamples.slice(0, 3).map(s => (
                      <button
                        key={s.id}
                        onClick={e => {
                          e.stopPropagation();
                          setDetailRec(s);
                        }}
                        title={sampleNamesText(s) || s.title}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '1px 5px',
                          borderRadius: 4,
                          background: 'var(--surface-2)',
                          color: 'var(--text-2)',
                          border: 'none',
                          borderLeft: `3px solid ${RATING_COLOR?.[s.rating] || 'var(--accent)'}`,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          textAlign: 'left',
                          width: '100%',
                          cursor: 'pointer',
                        }}
                      >
                        {sampleNamesText(s) || s.title}
                      </button>
                    ))}
                    {daySamples.length > 3 && (
                      <span style={{ fontSize: 9, color: 'var(--text-3)' }}>
                        +{daySamples.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 빈 상태 (갤러리·리스트 뷰) */}
      {!loading && (viewMode === 'grid' || viewMode === 'list') && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            {search
              ? `"${search}" 검색 결과가 없어요`
              : ratingMin > 0
                ? `별점 ${ratingMin}점 이상 샘플이 없어요`
                : catFilter !== 'all'
                  ? `${catFilter} 카테고리 샘플이 없어요`
                  : '샘플 기록이 없어요'}
          </div>
          {!search && catFilter === 'all' && ratingMin === 0 && (
            <button
              className="btn primary"
              style={{ marginTop: 8 }}
              onClick={() => router.push('/note/sample/write')}
            >
              첫 샘플 작성하기
            </button>
          )}
        </div>
      )}

      {/* 갤러리 그리드 */}
      {!loading && viewMode === 'grid' && filtered.length > 0 && (
        <div
          key={`${catFilter}|${ratingMin}|${sortBy}`}
          className="tab-content-enter"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((rec, i) => {
            const isBatchSelected = selected.has(rec.id);
            const compareIdx = compareIdxMap.has(rec.id) ? compareIdxMap.get(rec.id) : -1;

            return (
              <SampleCard
                key={rec.id}
                sample={rec}
                batchMode={batchMode}
                isBatchSelected={isBatchSelected}
                compareMode={compareMode}
                compareIdx={compareIdx}
                animDelay={Math.min(i, 8) * 40}
                onCardClick={() => {
                  if (batchMode) {
                    toggleSelect(rec.id);
                    return;
                  }
                  if (compareMode) {
                    toggleCompare(rec.id);
                    return;
                  }
                  setDetailRec(rec);
                }}
                onRatingChange={handleRatingChange}
                onEdit={() => router.push(`/note/sample/${rec.id}`)}
                onCopy={e => handleCopy(rec, e)}
                onDelete={() => handleDelete(rec)}
              />
            );
          })}
        </div>
      )}

      {/* 리스트 뷰 */}
      {!loading && viewMode === 'list' && filtered.length > 0 && (
        <div
          key={`list|${catFilter}|${ratingMin}|${sortBy}`}
          className="card table-card tab-content-enter"
        >
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}></th>
                  <th>제목</th>
                  <th>샘플명</th>
                  <th style={{ width: 90 }}>카테고리</th>
                  <th style={{ width: 110 }}>수령일</th>
                  <th style={{ width: 120 }}>업체</th>
                  <th style={{ width: 84 }}>담당자</th>
                  <th style={{ width: 84 }}>평점</th>
                  <th style={{ width: 110, textAlign: 'right' }}>단가</th>
                  <th style={{ width: 150 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(rec => (
                  <SampleListRow
                    key={rec.id}
                    sample={rec}
                    onClick={() => {
                      if (batchMode) {
                        toggleSelect(rec.id);
                        return;
                      }
                      if (compareMode) {
                        toggleCompare(rec.id);
                        return;
                      }
                      setDetailRec(rec);
                    }}
                    onEdit={() => router.push(`/note/sample/${rec.id}`)}
                    onCopy={e => handleCopy(rec, e)}
                    onDelete={() => handleDelete(rec)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 비교 모드 하단 바 */}
      {compareMode && compareSet.size >= 2 && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 40,
            padding: '12px 28px',
            fontWeight: 800,
            fontSize: 15,
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
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
    </main>
  );
}
