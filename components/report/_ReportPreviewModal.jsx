'use client';
import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { showToast } from '@/components/Toast';
import { printReportElements } from '@/lib/report/print';
import { ReportPreviewBody } from '@/components/report/ReportPreviewBody';
import { asPlainObject, REPORT_PREVIEW_PAGES } from '@/components/report/ReportPreviewPages';
import { ReportPreviewSidebar } from '@/components/report/ReportPreviewSidebar';

export function ReportPreviewModal({ report, onClose, onShare, printOnOpen = false }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = REPORT_PREVIEW_PAGES.length;
  const onCloseRef = useRef(onClose);
  const printSourceRef = useRef(null);
  const didAutoPrintRef = useRef(false);
  const safeReport = useMemo(() => asPlainObject(report), [report]);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  const handlePrint = useCallback(() => {
    try {
      const papers = printSourceRef.current?.querySelectorAll('.report-paper') || [];
      printReportElements(papers, safeReport);
      showToast('PDF 출력 창을 열었어요', 'ok', 1600);
    } catch (err) {
      showToast(err?.message || 'PDF 출력 실패', 'error');
    }
  }, [safeReport]);

  const handleShare = useCallback(() => {
    if (typeof onShare === 'function') onShare(safeReport);
    handleClose();
  }, [handleClose, onShare, safeReport]);

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'ArrowLeft') setCurrentPage(page => (page > 1 ? page - 1 : page));
      if (event.key === 'ArrowRight') {
        setCurrentPage(page => (page < totalPages ? page + 1 : page));
      }
      if (event.key === 'Escape' && typeof onCloseRef.current === 'function') {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  useEffect(() => {
    if (!printOnOpen || didAutoPrintRef.current) return;
    didAutoPrintRef.current = true;
    const id = setTimeout(handlePrint, 0);
    return () => clearTimeout(id);
  }, [handlePrint, printOnOpen]);

  return (
    <div className="modal-scrim">
      <div
        className="preview-shell"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-modal-title"
      >
        <ReportPreviewSidebar
          report={safeReport}
          currentPage={currentPage}
          onPage={setCurrentPage}
          onClose={handleClose}
          onShare={handleShare}
          onPrint={handlePrint}
        />
        <ReportPreviewBody
          report={safeReport}
          currentPage={currentPage}
          totalPages={totalPages}
          onPrev={() => setCurrentPage(page => Math.max(1, page - 1))}
          onNext={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
          printSourceRef={printSourceRef}
        />
      </div>
    </div>
  );
}
