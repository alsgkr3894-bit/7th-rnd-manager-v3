'use client';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function NotePageDialogs({
  confirmBatch,
  confirmMerge,
  dropMergeOpen,
  dropMergeTitle,
  dropMergeSourceCount,
  dropMergeMergedCount,
  unmergeOpen,
  unmergeTitle,
  unmergeCount,
  selectedCount,
  onConfirmBatchDelete,
  onCancelBatchDelete,
  onConfirmBatchMerge,
  onCancelBatchMerge,
  onConfirmDropMerge,
  onCancelDropMerge,
  onConfirmUnmerge,
  onCancelUnmerge,
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
        message="체크한 노트와 이미 연결된 차수를 하나의 묶음으로 다시 정렬합니다. 가장 오래된 기록이 1차가 되고, 사진과 상세 내용은 그대로 유지됩니다."
        confirmLabel="차수로 묶기"
        cancelLabel="취소"
        onConfirm={onConfirmBatchMerge}
        onCancel={onCancelBatchMerge}
      />
      <ConfirmDialog
        open={dropMergeOpen}
        title="이 카드들을 차수로 합칠까요?"
        message={`끌어온 ${dropMergeSourceCount || 0}개 차수를 "${dropMergeTitle || '대상 메뉴'}" 뒤에 넣어 총 ${dropMergeMergedCount || 0}개 차수 묶음으로 정렬합니다. 사진과 상세 내용은 삭제되지 않습니다.`}
        confirmLabel="합치기"
        cancelLabel="취소"
        onConfirm={onConfirmDropMerge}
        onCancel={onCancelDropMerge}
      />
      <ConfirmDialog
        open={unmergeOpen}
        title="차수 묶음을 분리할까요?"
        message={`"${unmergeTitle || '선택한 메뉴'}"의 ${unmergeCount || 0}개 차수 연결만 해제합니다. 저장된 내용과 사진은 삭제되지 않고 각각 독립 카드로 다시 표시됩니다.`}
        confirmLabel="분리하기"
        cancelLabel="취소"
        onConfirm={onConfirmUnmerge}
        onCancel={onCancelUnmerge}
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
