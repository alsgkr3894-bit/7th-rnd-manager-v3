'use client';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function NotePageDialogs({
  confirmBatch,
  selectedCount,
  onConfirmBatchDelete,
  onCancelBatchDelete,
  confirmDeletePreset,
  presetName,
  onConfirmPresetDelete,
  onCancelPresetDelete,
  singleDeleteOpen,
  onConfirmSingleDelete,
  onCancelSingleDelete,
}) {
  return (
    <>
      <ConfirmDialog
        open={confirmBatch}
        title={`노트 ${selectedCount}개를 삭제할까요?`}
        message="삭제한 후 잠시 동안 실행취소가 가능합니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={onConfirmBatchDelete}
        onCancel={onCancelBatchDelete}
      />
      <ConfirmDialog
        open={confirmDeletePreset !== null}
        title="프리셋을 삭제할까요?"
        message={
          presetName ? `"${presetName}" 프리셋이 삭제됩니다.` : '선택한 프리셋이 삭제됩니다.'
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={onConfirmPresetDelete}
        onCancel={onCancelPresetDelete}
      />
      <ConfirmDialog
        open={singleDeleteOpen}
        title="노트를 삭제할까요?"
        message="삭제한 후 잠시 동안 실행취소가 가능합니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        onConfirm={onConfirmSingleDelete}
        onCancel={onCancelSingleDelete}
      />
    </>
  );
}
