'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SAMPLE_CATEGORIES } from '@/lib/sample';
import { useSampleBatchMode } from '@/hooks/useSampleBatchMode';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useSampleCompareMode } from '@/hooks/useSampleCompareMode';
import { CompareModal } from './_CompareModal';
import { SampleDetailModal } from './_SampleDetailModal';
import { SampleCalendarView } from './_SampleCalendarView';
import { SampleFilterControls } from './_SampleFilterControls';
import { SamplePageActions } from './_SamplePageActions';
import { SampleRecordsView } from './_SampleRecordsView';
import { SAMPLE_SORT_OPTIONS, useSamplePageState } from './useSamplePageState';
import { useSampleRecordActions } from './useSampleRecordActions';

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

  const {
    samples,
    setSamples,
    search,
    searchHistory,
    showSearchHist,
    setShowSearchHist,
    catFilter,
    setCatFilter,
    ratingMin,
    setRatingMin,
    sortBy,
    applySortBy,
    viewMode,
    applyViewMode,
    calMonth,
    goPrevMonth,
    goNextMonth,
    detailRec,
    setDetailRec,
    loading,
    loadError,
    reload,
    handleSearchChange,
    closeSearchHistorySoon,
    selectSearchHistory,
    filtered,
    catCounts,
    ratingDist,
    calDays,
    samplesByDate,
    today,
  } = useSamplePageState({ searchParams, pathname });

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

  const { handleDelete, handleCopy, handleRatingChange } = useSampleRecordActions({
    setSamples,
    setDetailRec,
    reload,
    showConfirm,
  });

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
        sortOptions={SAMPLE_SORT_OPTIONS}
        sortBy={sortBy}
        onSortChange={applySortBy}
        viewMode={viewMode}
        onViewModeChange={applyViewMode}
        search={search}
        onSearchChange={handleSearchChange}
        showSearchHist={showSearchHist}
        onSearchFocus={() => setShowSearchHist(true)}
        onSearchBlur={closeSearchHistorySoon}
        searchHistory={searchHistory}
        onSelectSearchHistory={selectSearchHistory}
      />

      {!loading && viewMode === 'calendar' && (
        <SampleCalendarView
          days={calDays}
          calMonth={calMonth}
          samplesByDate={samplesByDate}
          today={today}
          onPrevMonth={goPrevMonth}
          onNextMonth={goNextMonth}
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
