import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ScheduleModal } from './_ScheduleModal';

export function CalendarPageDialogs({
  modal,
  confirmDeleteOpen,
  onSaveSchedule,
  onCloseSchedule,
  onRequestDeleteSchedule,
  onConfirmDeleteSchedule,
  onCancelDeleteSchedule,
}) {
  return (
    <>
      {modal && (
        <ScheduleModal
          initial={modal.schedule}
          defaultDate={modal.date}
          onSave={onSaveSchedule}
          onClose={onCloseSchedule}
          onDelete={onRequestDeleteSchedule}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="일정 삭제"
        message={`"${modal?.schedule?.title}" 일정을 삭제할까요?`}
        confirmLabel="삭제"
        danger
        onConfirm={onConfirmDeleteSchedule}
        onCancel={onCancelDeleteSchedule}
      />
    </>
  );
}
