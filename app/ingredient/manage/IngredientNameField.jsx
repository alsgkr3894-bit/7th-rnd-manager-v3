'use client';
import { Field } from './IngredientFormSections';

export function IngredientNameField({ form, errors, isJetteLinked, initial, onSet }) {
  return (
    <Field
      label="재료명"
      required={!isJetteLinked}
      error={errors.ingredientName}
      errorId="ingredientName-error"
      hint={isJetteLinked ? '비워두면 제때 제품명 자동 사용' : undefined}
    >
      <input
        className="form-input"
        value={form.ingredientName}
        aria-describedby={errors.ingredientName ? 'ingredientName-error' : undefined}
        onChange={e => onSet('ingredientName', e.target.value)}
        placeholder={isJetteLinked ? initial?.displayName : '예) 모짜렐라치즈'}
      />
    </Field>
  );
}
