import { buildReportPaginationItems } from './reportListTableUtils';

export function ReportListPagination({ totalPages, safePage, setPage }) {
  if (totalPages <= 1) return null;

  return (
    <div className="report-pagination">
      <button
        className="page-btn"
        disabled={safePage === 1}
        onClick={() => setPage(page => page - 1)}
      >
        ‹
      </button>
      {buildReportPaginationItems(totalPages, safePage).map((page, index) =>
        page === '…' ? (
          <span key={`e${index}`} style={{ padding: '0 4px', color: 'var(--text-3)' }}>
            …
          </span>
        ) : (
          <button
            key={page}
            className={`page-btn ${page === safePage ? 'active' : ''}`}
            onClick={() => setPage(page)}
          >
            {page}
          </button>
        )
      )}
      <button
        className="page-btn"
        disabled={safePage === totalPages}
        onClick={() => setPage(page => page + 1)}
      >
        ›
      </button>
    </div>
  );
}
