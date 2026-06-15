'use client';
import { Field } from './IngredientFormSections';
import { IngredientRadioOption } from './IngredientRadioOption';

const TEMP_OPTIONS = ['냉장', '냉동', '상온', '공산품'];
const TAX_OPTIONS = ['과세', '면세'];

export function IngredientManualCostFields({ form, errors, onSet }) {
  return (
    <>
      <Field label="보관 온도">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <IngredientRadioOption
            value=""
            checked={form.temperature === ''}
            onChange={() => onSet('temperature', '')}
            muted
          >
            미지정
          </IngredientRadioOption>
          {TEMP_OPTIONS.map(option => (
            <IngredientRadioOption
              key={option}
              value={option}
              checked={form.temperature === option}
              onChange={() => onSet('temperature', option)}
            >
              {option}
            </IngredientRadioOption>
          ))}
        </div>
      </Field>

      <Field label="과세구분">
        <div style={{ display: 'flex', gap: 12 }}>
          {TAX_OPTIONS.map(option => (
            <IngredientRadioOption
              key={option}
              value={option}
              checked={form.taxType === option}
              onChange={() => onSet('taxType', option)}
            >
              {option}
            </IngredientRadioOption>
          ))}
        </div>
      </Field>

      <Field
        label="수동 단가 (부가세포함)"
        hint="제때 연동 없을 때 사용"
        error={errors.priceOverride}
        errorId="priceOverride-error"
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="form-input"
            type="number"
            min="0"
            value={form.priceOverride}
            aria-describedby={errors.priceOverride ? 'priceOverride-error' : undefined}
            onChange={e => onSet('priceOverride', e.target.value)}
            placeholder="예) 7680"
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 13, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>원</span>
        </div>
      </Field>
    </>
  );
}
