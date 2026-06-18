'use client';
import { IngredientManualCostFields } from './IngredientManualCostFields';
import { IngredientPackageQuantityField } from './IngredientPackageQuantityField';
import { IngredientScopeNoteFields } from './IngredientScopeNoteFields';

export function IngredientCostFields({ form, errors, isJetteLinked, onSet }) {
  return (
    <>
      <IngredientPackageQuantityField
        form={form}
        errors={errors}
        isJetteLinked={isJetteLinked}
        onSet={onSet}
      />
      {isJetteLinked ? (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-3)',
            padding: '8px 12px',
            background: 'var(--surface-2)',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}
        >
          단가는 제때 가격파일에서 자동 갱신됩니다. 수동 단가·보관온도·과세구분은 제때 값을
          사용합니다.
        </div>
      ) : (
        <IngredientManualCostFields form={form} errors={errors} onSet={onSet} />
      )}
      <IngredientScopeNoteFields form={form} isJetteLinked={isJetteLinked} onSet={onSet} />
    </>
  );
}
