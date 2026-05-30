'use client';
import { TYPE_OPTIONS, TYPE_LABEL, typeSelectStyle } from './managed-products-constants';

/**
 * 테이블 셀 내 제품 분류 선택 select.
 * PriceLatestView, PriceCompareTable 공용.
 */
export function TypeSelect({ productCode, productName, productTypeLookup, onTypeChange }) {
  const current = productCode ? productTypeLookup.get(productCode)?.productType || '' : '';
  return (
    <select
      value={current}
      onChange={e => {
        if (e.target.value && onTypeChange) onTypeChange(productCode, productName, e.target.value);
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
