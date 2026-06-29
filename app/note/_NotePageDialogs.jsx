'use client';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function NotePageDialogs({
  confirmBatch,
  confirmMerge,
  selectedCount,
  onConfirmBatchDelete,
  onCancelBatchDelete,
  onConfirmBatchMerge,
  onCancelBatchMerge,
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
        open={confirmMerge}
        title={`노트 ${selectedCount}개를 차수로 묶을까요?`}
        message="가장 오래된 기록이 1차가 되고, 나머지는 날짜순으로 2차·3차로 연결됩니다. 사진과 상세 내용은 그대로 유지됩니다."
        confirmLabel="차수로 묶기"
        cancelLabel="취소"
        onConfirm={onConfirmBatchMerge}
        onCancel={onCancelBatchMerge}
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
