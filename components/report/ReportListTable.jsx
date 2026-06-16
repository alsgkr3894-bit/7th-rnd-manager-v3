import { ReportListEmptyState } from './report-list-table/ReportListEmptyState';
import { ReportListPagination } from './report-list-table/ReportListPagination';
import { ReportListRow } from './report-list-table/ReportListRow';
import { ReportListTableHeader } from './report-list-table/ReportListTableHeader';
import { buildReportListRowModel } from './report-list-table/reportListTableUtils';

export function ReportListTable({
  list,
  reports,
  sortKey,
  sortDir,
  toggleSort,
  editingId,
  editName,
  editInputRef,
  setEditName,
  setEditingId,
  commitEdit,
  startEdit,
  newIds,
  deletingId,
  totalPages,
  safePage,
  setPage,
  setNewReportOpen,
  handleToggleFav,
  handleDelete,
  setPreviewTarget,
  setPreviewPrintOnOpen,
  setShareTarget,
}) {
  return (
    <div className="card table-card">
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table stagger-rows">
          <ReportListTableHeader
            sortKey={sortKey}
            sortDir={sortDir}
            toggleSort={toggleSort}
          />
          <tbody>
            {list.map(report => {
              const model = buildReportListRowModel(report, { deletingId, editingId, newIds });
              return (
                <ReportListRow
                  key={model.rowKey}
                  report={report}
                  model={model}
                  editName={editName}
                  editInputRef={editInputRef}
                  setEditName={setEditName}
                  setEditingId={setEditingId}
                  commitEdit={commitEdit}
                  startEdit={startEdit}
                  handleToggleFav={handleToggleFav}
                  handleDelete={handleDelete}
                  setPreviewTarget={setPreviewTarget}
                  setPreviewPrintOnOpen={setPreviewPrintOnOpen}
                  setShareTarget={setShareTarget}
                />
              );
            })}
            {list.length === 0 && (
              <ReportListEmptyState reports={reports} setNewReportOpen={setNewReportOpen} />
            )}
          </tbody>
        </table>
      </div>

      <ReportListPagination totalPages={totalPages} safePage={safePage} setPage={setPage} />
    </div>
  );
}
