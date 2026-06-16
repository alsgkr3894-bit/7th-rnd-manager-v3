import dynamic from 'next/dynamic';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NewReportModal } from '@/components/report/NewReportModal';

const ShareLinkModal = dynamic(
  () => import('@/components/report/ReportModals').then(m => ({ default: m.ShareLinkModal })),
  { ssr: false }
);
const ScheduleManagerModal = dynamic(
  () => import('@/components/report/ReportModals').then(m => ({ default: m.ScheduleManagerModal })),
  { ssr: false }
);
const ReportPreviewModal = dynamic(
  () => import('@/components/report/ReportModals').then(m => ({ default: m.ReportPreviewModal })),
  { ssr: false }
);

export function ReportPageDialogs({
  confirmDeleteId,
  setConfirmDeleteId,
  confirmDelete,
  pruneConfirmOpen,
  setPruneConfirmOpen,
  prunableCount,
  confirmPrune,
  shareTarget,
  setShareTarget,
  scheduleOpen,
  setScheduleOpen,
  previewTarget,
  previewPrintOnOpen,
  setPreviewTarget,
  setPreviewPrintOnOpen,
  newReportOpen,
  setNewReportOpen,
  router,
}) {
  return (
    <>
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="보고서를 삭제할까요?"
        message="삭제한 보고서는 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
      <ConfirmDialog
        open={pruneConfirmOpen}
        title="오래된 보고서 정리"
        message={`90일이 지난 보고서 ${prunableCount}건을 삭제합니다. 되돌릴 수 없습니다.`}
        confirmLabel="정리"
        cancelLabel="취소"
        danger
        onConfirm={confirmPrune}
        onCancel={() => setPruneConfirmOpen(false)}
      />
      {shareTarget && <ShareLinkModal report={shareTarget} onClose={() => setShareTarget(null)} />}
      {scheduleOpen && <ScheduleManagerModal onClose={() => setScheduleOpen(false)} />}
      {previewTarget && (
        <ReportPreviewModal
          report={previewTarget}
          printOnOpen={previewPrintOnOpen}
          onClose={() => {
            setPreviewTarget(null);
            setPreviewPrintOnOpen(false);
          }}
          onShare={r => {
            setPreviewTarget(null);
            setPreviewPrintOnOpen(false);
            setShareTarget(r);
          }}
        />
      )}
      {newReportOpen && <NewReportModal onClose={() => setNewReportOpen(false)} router={router} />}
    </>
  );
}
