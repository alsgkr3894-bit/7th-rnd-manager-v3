'use client';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BulkPriceModal } from '@/components/cost/menu-price/BulkPriceModal';
import { MenuMasterEditModal } from '@/components/menu-master/MenuMasterEditModal';

const DELETE_PLAN_LABELS = {
  cost_selling_prices: '판매가',
  menu_recipes: '메뉴 레시피',
  nutrition_menu_ref: '영양 메뉴',
  nutrition_raw_values: '영양값',
};

function buildMenuDeleteMessage(row, plan, loading) {
  const lines = [
    `"${row.menuName}" 메뉴를 삭제합니다.`,
    '연결된 판매가, 메뉴 레시피, 영양 참조 데이터도 함께 정리됩니다.',
  ];
  if (loading) {
    lines.push('영향 범위를 계산 중입니다.');
    return lines.join('\n');
  }
  if (!plan) {
    lines.push('영향 범위를 불러오지 못했습니다.');
    return lines.join('\n');
  }
  const counts = plan.linkedCounts || {};
  const summary = Object.entries(DELETE_PLAN_LABELS)
    .map(([storeName, label]) => `${label} ${Number(counts[storeName]) || 0}건`)
    .join(' · ');
  lines.push(`삭제 영향: ${summary}`);
  return lines.join('\n');
}

export function MenuMasterDialogs({
  editRow,
  editIntent = null,
  addOpen,
  bulkOpen,
  deleteTarget,
  deletePlan,
  deletePlanLoading,
  confirmReset,
  isViewer = false,
  brandCats,
  onSaveRow,
  onRecipeSaved,
  onCloseEdit,
  onCloseAdd,
  onCloseBulk,
  onConfirmDelete,
  onCancelDelete,
  onConfirmReset,
  onCancelReset,
}) {
  return (
    <>
      {!isViewer && editRow && (
        <MenuMasterEditModal
          row={editRow}
          isNew={false}
          onSave={onSaveRow}
          onClose={onCloseEdit}
          presetCategories={brandCats}
          onRecipeSaved={onRecipeSaved}
          initialFocus={editIntent}
        />
      )}

      {!isViewer && addOpen && (
        <MenuMasterEditModal
          row={null}
          isNew
          onSave={onSaveRow}
          onClose={onCloseAdd}
          presetCategories={brandCats}
          onRecipeSaved={onRecipeSaved}
        />
      )}

      {!isViewer && bulkOpen && <BulkPriceModal onClose={onCloseBulk} onDone={onRecipeSaved} />}

      {!isViewer && deleteTarget && (
        <ConfirmDialog
          open
          message={buildMenuDeleteMessage(deleteTarget, deletePlan, deletePlanLoading)}
          danger
          onConfirm={() => onConfirmDelete(deleteTarget)}
          onCancel={onCancelDelete}
        />
      )}

      {!isViewer && confirmReset && (
        <ConfirmDialog
          open
          message="메뉴 마스터 전체를 삭제합니다. 계속할까요?"
          danger
          onConfirm={onConfirmReset}
          onCancel={onCancelReset}
        />
      )}
    </>
  );
}
