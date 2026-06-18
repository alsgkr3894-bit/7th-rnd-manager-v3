'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { getReports } from '@/lib/report';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useDBLoad } from '@/hooks/useDBLoad';
import { useReportListState } from '@/hooks/useReportListState';
import { useReportActions } from '@/hooks/useReportActions';
import { formatLocalMonthInput } from '@/lib/date/local-date';
import { asObjectArray } from '@/lib/ui/prop-guards';
import { exportReportListToExcel } from '@/lib/report/report-list-utils';
import { ReportFilterToolbar } from '@/components/report/ReportFilterToolbar';
import { ReportKindGrid } from '@/components/report/ReportKindGrid';
import { ReportListSkeleton } from '@/components/report/ReportListSkeleton';
import { ReportStatsRow } from '@/components/report/ReportStatsRow';
import { ReportListTable } from '@/components/report/ReportListTable';
import { ReportSnapshotCard } from '@/components/report/ReportSnapshotCard';
import { ReportPageDialogs } from '@/components/report/ReportPageDialogs';

const thisMonth = formatLocalMonthInput();

export default function Page() {
  const router = useRouter();
  const [shareTarget, setShareTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [previewPrintOnOpen, setPreviewPrintOnOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [newReportOpen, setNewReportOpen] = useState(false);

  const { data: reportsData, loading, error: loadError, reload } = useDBLoad(() => getReports());
  const reports = useMemo(() => asObjectArray(reportsData), [reportsData]);

  useVisibilityRefresh(reload);

  const {
    kindFilter,
    setKindFilter,
    search,
    setSearch,
    favOnly,
    setFavOnly,
    page,
    setPage,
    sortKey,
    sortDir,
    newIds,
    filtered,
    totalPages,
    safePage,
    list,
    toggleSort,
  } = useReportListState(reports);

  const {
    deletingId,
    confirmDeleteId,
    setConfirmDeleteId,
    pruneConfirmOpen,
    setPruneConfirmOpen,
    prunableCount,
    editingId,
    setEditingId,
    editName,
    setEditName,
    editInputRef,
    handleDelete,
    confirmDelete,
    handlePruneClick,
    confirmPrune,
    handleToggleFav,
    startEdit,
    commitEdit,
  } = useReportActions({ reload });

  const stats = {
    total: reports.length,
    thisMonth: reports.filter(r => String(r.createdAt ?? '').startsWith(thisMonth)).length,
    auto: 0,
    sharedLinks: reports.reduce((s, r) => s + (Number(r.links) || 0), 0),
  };

  if (loadError) {
    return (
      <main className="main">
        <div
          className="card"
          style={{ padding: 32, textAlign: 'center', color: 'var(--negative)', marginTop: 32 }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>보고서 로드 실패</div>
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
    <main className="main">
      <ReportPageDialogs
        confirmDeleteId={confirmDeleteId}
        setConfirmDeleteId={setConfirmDeleteId}
        confirmDelete={confirmDelete}
        pruneConfirmOpen={pruneConfirmOpen}
        setPruneConfirmOpen={setPruneConfirmOpen}
        prunableCount={prunableCount}
        confirmPrune={confirmPrune}
        shareTarget={shareTarget}
        setShareTarget={setShareTarget}
        scheduleOpen={scheduleOpen}
        setScheduleOpen={setScheduleOpen}
        previewTarget={previewTarget}
        previewPrintOnOpen={previewPrintOnOpen}
        setPreviewTarget={setPreviewTarget}
        setPreviewPrintOnOpen={setPreviewPrintOnOpen}
        newReportOpen={newReportOpen}
        setNewReportOpen={setNewReportOpen}
        router={router}
      />

      <PageHeader
        breadcrumb={['보고서센터']}
        title="보고서센터"
        sub="판매량·가격·출고량·비교·원가 보고서를 한 곳에서 생성하고 보관해요."
        actions={
          <>
            <button className="btn" onClick={handlePruneClick}>
              오래된 보고서 정리
            </button>
            <button className="btn" onClick={() => exportReportListToExcel(reports)}>
              <Icon.download style={{ width: 14, height: 14 }} />
              엑셀로 내보내기
            </button>
            <button className="btn" onClick={() => setScheduleOpen(true)}>
              <Icon.gear style={{ width: 14, height: 14 }} />
              예약 설정
            </button>
            <button className="btn primary" onClick={() => setNewReportOpen(true)}>
              <Icon.plus style={{ width: 14, height: 14 }} />새 보고서 생성
            </button>
          </>
        }
      />

      <ReportStatsRow
        stats={stats}
        monthLabel={thisMonth.replace('-', '.')}
        onOpenSchedule={() => setScheduleOpen(true)}
      />

      <ReportKindGrid reports={reports} onOpenKind={href => router.push(href)} />

      <ReportFilterToolbar
        reports={reports}
        search={search}
        onSearch={setSearch}
        kindFilter={kindFilter}
        onKindFilterChange={setKindFilter}
        favOnly={favOnly}
        onFavOnlyChange={setFavOnly}
        filteredCount={filtered.length}
      />

      {loading && <ReportListSkeleton />}

      {!loading && (
        <ReportListTable
          list={list}
          reports={reports}
          sortKey={sortKey}
          sortDir={sortDir}
          toggleSort={toggleSort}
          editingId={editingId}
          editName={editName}
          editInputRef={editInputRef}
          setEditName={setEditName}
          setEditingId={setEditingId}
          commitEdit={commitEdit}
          startEdit={startEdit}
          newIds={newIds}
          deletingId={deletingId}
          totalPages={totalPages}
          safePage={safePage}
          setPage={setPage}
          setNewReportOpen={setNewReportOpen}
          handleToggleFav={handleToggleFav}
          handleDelete={handleDelete}
          setPreviewTarget={setPreviewTarget}
          setPreviewPrintOnOpen={setPreviewPrintOnOpen}
          setShareTarget={setShareTarget}
        />
      )}

      {!loading && <ReportSnapshotCard />}
    </main>
  );
}
