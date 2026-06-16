'use client';
import { Icon } from '@/components/icons';
import { ReportPaper, REPORT_PREVIEW_PAGES } from '@/components/report/ReportPreviewPages';

export function ReportPreviewBody({ report, currentPage, totalPages, onPrev, onNext, printSourceRef }) {
  return (
    <>
      <div className="preview-body">
        <ReportPaper report={report} pageIndex={currentPage - 1} />
        <div className="preview-pager">
          <button className="pager-btn" onClick={onPrev} disabled={currentPage === 1}>
            <Icon.chevLeft style={{ width: 16, height: 16 }} />
          </button>
          <div className="pager-info">
            {currentPage} / {totalPages}
          </div>
          <button className="pager-btn" onClick={onNext} disabled={currentPage === totalPages}>
            <Icon.chevRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
      <div ref={printSourceRef} aria-hidden="true" style={{ display: 'none' }}>
        {REPORT_PREVIEW_PAGES.map((_, index) => (
          <ReportPaper key={index} report={report} pageIndex={index} />
        ))}
      </div>
    </>
  );
}
