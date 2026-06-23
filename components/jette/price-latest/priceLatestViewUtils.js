import { sortByKey, getProductTypeCounts } from '@/lib/jette/utils';
import { normalizeProductType } from '@/lib/jette/product-types';

export const PRODUCT_SORT_DIR = key =>
  key === 'productName' || key === 'productCode' ? 'asc' : 'desc';

export const LATEST_PRICE_CSV_HEADERS = [
  '제품코드',
  '제품명',
  '분류',
  '과세구분',
  '판매단위',
  '온도',
  '단가',
  '부가세포함가',
];

export function getLatestTypeCounts(rows, productTypeLookup) {
  return getProductTypeCounts(rows, productTypeLookup);
}

export function filterLatestRowsByType(rows, typeFilter, productTypeLookup) {
  if (typeFilter === 'all') return rows;
  return rows.filter(row => {
    const product = productTypeLookup.get(row.productCode);
    return (
      product && normalizeProductType(product.productType) === normalizeProductType(typeFilter)
    );
  });
}

export function getLatestTaxCounts(rows) {
  return {
    taxable: rows.filter(row => row.taxType === '과세').length,
    exempt: rows.filter(row => row.taxType === '면세').length,
  };
}

export function filterAndSortLatestRows({ rows, search, taxFilter, sortKey, sortDir }) {
  let list = rows;
  if (taxFilter !== 'all') list = list.filter(row => row.taxType === taxFilter);

  const query = search.trim().toLowerCase();
  if (query) {
    list = list.filter(
      row =>
        (row.productName || '').toLowerCase().includes(query) ||
        (row.productCode || '').toLowerCase().includes(query)
    );
  }

  return sortByKey(list, sortKey, sortDir);
}

export function buildLatestPriceCsvRows(rows, productTypeLookup) {
  const body = rows.map(row => [
    row.productCode || '',
    row.productName || '',
    productTypeLookup.get(row.productCode)
      ? normalizeProductType(productTypeLookup.get(row.productCode)?.productType)
      : '',
    row.taxType || '',
    row.salesUnit || '',
    row.temperature || '',
    row.price ?? '',
    row.priceWithTax ?? '',
  ]);

  return [LATEST_PRICE_CSV_HEADERS, ...body];
}

export function latestTaxChipStyle(taxType) {
  return {
    background: taxType === '과세' ? 'var(--accent-soft)' : 'var(--surface-2)',
    color: taxType === '과세' ? 'var(--accent-text)' : 'var(--text-2)',
  };
}
