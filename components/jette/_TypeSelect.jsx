'use client';
import {
  normalizeProductType,
  TYPE_LABEL,
  TYPE_OPTIONS,
  typeSelectStyle,
} from './managed-products-constants';
import { asDisplayText } from '@/lib/ui/prop-guards';

/**
 * 테이블 셀 내 제품 분류 선택 select.
 * PriceLatestView, PriceCompareTable 공용.
 */
export function TypeSelect({
  productCode,
  productName,
  productTypeLookup = new Map(),
  disabled = false,
  onTypeChange,
}) {
  const safeProductCode = asDisplayText(productCode);
  const safeProductName = asDisplayText(productName);
  const rawCurrent =
    safeProductCode && typeof productTypeLookup?.get === 'function'
      ? asDisplayText(productTypeLookup.get(safeProductCode)?.productType)
      : '';
  const current = rawCurrent ? normalizeProductType(rawCurrent) : '';
  const handleTypeChange = typeof onTypeChange === 'function' ? onTypeChange : null;

  return (
    <select
      value={current}
      onChange={e => {
        if (disabled) return;
        if (e.target.value && handleTypeChange)
          handleTypeChange(safeProductCode, safeProductName, e.target.value);
      }}
      disabled={disabled}
      style={typeSelectStyle}
    >
      <option value="">미분류</option>
      {TYPE_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>
          {TYPE_LABEL[o.value]}
        </option>
      ))}
    </select>
  );
}
