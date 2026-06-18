import { COST_BASE_UNITS } from '@/lib/cost/unit-policy';
import { FieldError, FormField } from './RegisterModalPrimitives';

export function RegisterModalCostFields({ form, suppliers, errors, setField, onSupplierChange }) {
  return (
    <>
      <FormField label="포장수량" hint="g·개 단가 계산에 사용 (예: 1000 g, 20 개)">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            type="number"
            min="0"
            value={form.baseQuantity}
            onChange={event => setField('baseQuantity', event.target.value)}
            placeholder="예) 1000"
            style={{ flex: 1 }}
          />
          <select
            className="form-input"
            value={form.baseUnitType}
            onChange={event => setField('baseUnitType', event.target.value)}
            style={{ width: 80 }}
          >
            {COST_BASE_UNITS.map(unit => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
        <FieldError>{errors.baseQuantity}</FieldError>
      </FormField>

      <FormField label="공급업체" hint="선택 안 하면 빈칸으로 저장">
        <select className="form-input" value={form.supplierId} onChange={onSupplierChange}>
          <option value="">선택 안 함</option>
          {suppliers.map(supplier => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="단가 (직접 입력)" hint="비워두면 제때 연동가 사용">
        <input
          className="form-input"
          type="number"
          min="0"
          step="1"
          value={form.priceOverride}
          onChange={event => setField('priceOverride', event.target.value)}
          placeholder="예) 5000"
        />
        <FieldError>{errors.priceOverride}</FieldError>
      </FormField>
    </>
  );
}
