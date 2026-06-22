'use client';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CompareModal } from './_CompareModal';
import { SampleDetailModal } from './_SampleDetailModal';

export function SamplePageDialogs({
  detailRec,
  showCompare,
  compareItems,
  confirmOpen,
  selectedCount,
  confirmElement,
  canEdit = false,
  onCloseDetail,
  onEditDetail,
  onDeleteDetail,
  onCloseCompare,
  onConfirmBatchDelete,
  onCancelBatchDelete,
}) {
  return (
    <>
      {detailRec && (
        <SampleDetailModal
          sample={detailRec}
          onClose={onCloseDetail}
          onEdit={onEditDetail}
          onDelete={onDeleteDetail}
          canEdit={canEdit}
        />
      )}

      {showCompare && compareItems.length >= 2 && (
        <CompareModal samples={compareItems} onClose={onCloseCompare} />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`샘플 ${selectedCount}개를 삭제할까요?`}
        message="삭제한 샘플은 목록에서 제거됩니다."
        confirmLabel="삭제"
        danger
        onConfirm={onConfirmBatchDelete}
        onCancel={onCancelBatchDelete}
        disabled={!canEdit}
      />
      {confirmElement}
    </>
  );
}
