'use client';
import { TYPE_OPTIONS, TYPE_LABEL, typeSelectStyle } from './managed-products-constants';
import { asDisplayText } from '@/lib/ui/prop-guards';

const TYPE_VALUES = new Set(TYPE_OPTIONS.map(option => option.value));

/**
 * 테이블 셀 내 제품 분류 선택 select.
 * PriceLatestView, PriceCompareTable 공용.
 */
export function TypeSelect({ productCode, productName, productTypeLookup = new Map(), onTypeChange }) {
  const safeProductCode = asDisplayText(productCode);
  const safeProductName = asDisplayText(productName);
  const rawCurrent = safeProductCode && typeof productTypeLookup?.get === 'function'
    ? asDisplayText(productTypeLookup.get(safeProductCode)?.productType)
    : '';
  const current = TYPE_VALUES.has(rawCurrent) ? rawCurrent : '';
  const handleTypeChange = typeof onTypeChange === 'function' ? onTypeChange : null;

  return (
    <select
      value={current}
      onChange={e => {
        if (e.target.value && handleTypeChange) handleTypeChange(safeProductCode, safeProductName, e.target.value);
      }}
      style={typeSelectStyle}
    >
      <option value="">미분류</option>
      {TYPE_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{TYPE_LABEL[o.value]}</option>
      ))}
    </select>
  );
}
