'use client';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SubstituteLinkModal } from '@/components/ingredient/SubstituteLinkModal';
import { IngredientForm } from './IngredientForm';

/**
 * 식자재관리 page.jsx 하단에 조립되는 모달 묶음
 * (분류/태그 제거 확인, 대체 연결 모달, 추가/수정 폼).
 */
export function IngredientManagePageDialogs({
  isViewer,
  confirmRemove,
  onConfirmRemoveClose,
  onRemoveCategory,
  onRemoveTag,
  substituteSource,
  onSubstituteClose,
  rows,
  onReplaceJetteProduct,
  formTarget,
  onFormClose,
  onSave,
  mainCats,
  originSuggestions,
  latestPriceRows,
  supplierNames,
}) {
  if (isViewer) return null;

  return (
    <>
      {confirmRemove && (
        <ConfirmDialog
          open
          danger
          message={
            confirmRemove.type === 'cat'
              ? `'${confirmRemove.value}' 분류를 모든 식자재에서 제거할까요?`
              : `'#${confirmRemove.value}' 태그를 모든 식자재에서 제거할까요?`
          }
          confirmLabel="삭제"
          onConfirm={() => {
            const { type, value } = confirmRemove;
            onConfirmRemoveClose();
            if (type === 'cat') onRemoveCategory(value);
            else onRemoveTag(value);
          }}
          onCancel={onConfirmRemoveClose}
        />
      )}

      <SubstituteLinkModal
        open={!!substituteSource}
        sourceRow={substituteSource}
        candidates={rows}
        onConfirm={target => onReplaceJetteProduct(substituteSource, target)}
        onClose={onSubstituteClose}
      />

      {formTarget !== null && (
        <IngredientForm
          initial={formTarget === 'new' || formTarget?.__copyFrom ? null : formTarget}
          copyFrom={formTarget?.__copyFrom || null}
          onSave={onSave}
          onClose={onFormClose}
          extraCategories={mainCats}
          originSuggestions={originSuggestions}
          existingProductCodes={rows.filter(r => r.productCode).map(r => r.productCode)}
          jettePriceRows={latestPriceRows}
          supplierNames={supplierNames}
          replacementCandidates={rows}
        />
      )}
    </>
  );
}
