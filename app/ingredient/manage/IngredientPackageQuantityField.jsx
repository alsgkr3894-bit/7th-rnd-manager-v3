'use client';
import { COST_BASE_UNITS } from '@/lib/cost/unit-policy';
import { Field } from './IngredientFieldPrimitives';

export function IngredientPackageQuantityField({ form, errors, isJetteLinked, onSet }) {
  return (
    <>
      <Field
        label="포장수량"
        hint={
          isJetteLinked
            ? '향후 원가표 연동 시 자동 입력 (현재는 수동)'
            : 'g·개당 단가 자동 계산에 사용'
        }
        error={errors.baseQuantity}
        errorId="baseQuantity-error"
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            type="number"
            min="0"
            value={form.baseQuantity}
            aria-describedby={errors.baseQuantity ? 'baseQuantity-error' : undefined}
            onChange={e => onSet('baseQuantity', e.target.value)}
            placeholder="예) 1000"
            style={{ flex: 1 }}
          />
          <select
            className="form-input"
            value={form.baseUnitType}
            onChange={e => onSet('baseUnitType', e.target.value)}
            style={{ width: 80 }}
          >
            {COST_BASE_UNITS.map(unit => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </Field>

      {form.baseUnitType === '개' && (
        <Field
          label="1개당 g"
          hint="g당 원가 환산에 사용 (선택)"
          error={errors.pieceWeightGrams}
          errorId="pieceWeightGrams-error"
        >
          <input
            className="form-input"
            type="number"
            min="0"
            value={form.pieceWeightGrams}
            aria-describedby={errors.pieceWeightGrams ? 'pieceWeightGrams-error' : undefined}
            onChange={e => onSet('pieceWeightGrams', e.target.value)}
            placeholder="예) 25"
          />
        </Field>
      )}
    </>
  );
}
