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
      {!isJetteLinked && <IngredientManualCostFields form={form} errors={errors} onSet={onSet} />}
      <IngredientScopeNoteFields form={form} isJetteLinked={isJetteLinked} onSet={onSet} />
    </>
  );
}
