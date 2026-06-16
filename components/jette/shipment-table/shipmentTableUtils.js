import { sortByKey } from '@/lib/jette/utils';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

export const PRODUCT_TYPE_ORDER = { exclusive: 0, generic: 1, 'generic-managed': 2 };

export const SHIPMENT_KEY_TRANSFORM = {
  productType: value => PRODUCT_TYPE_ORDER[value] ?? 9,
  isManaged: value => (value ? 1 : 0),
};

export const PRODUCT_TYPE_META = {
  exclusive: { label: '전용상품', bg: 'var(--accent-soft)', color: 'var(--accent-text)' },
  generic: { label: '범용상품', bg: 'var(--scope-generic-soft)', color: 'var(--scope-generic)' },
  'generic-managed': {
    label: '범용관리',
    bg: 'var(--scope-generic)',
    color: 'var(--scope-generic-ink)',
  },
};

export function getShipmentCounts(rows) {
  const safeRows = asObjectArray(rows);
  return {
    all: safeRows.length,
    exclusive: safeRows.filter(row => row.productType === 'exclusive').length,
    generic: safeRows.filter(row => row.productType === 'generic').length,
    'generic-managed': safeRows.filter(row => row.productType === 'generic-managed').length,
    managed: safeRows.filter(row => row.isManaged).length,
  };
}

export function filterAndSortShipmentRows({ rows, search, typeFilter, managedOnly, sortKey, sortDir }) {
  let list = asObjectArray(rows);
  if (typeFilter !== 'all') list = list.filter(row => row.productType === typeFilter);
  if (managedOnly) list = list.filter(row => row.isManaged);

  const query = search.trim().toLowerCase();
  if (query) {
    list = list.filter(
      row =>
        asDisplayText(row.productName).toLowerCase().includes(query) ||
        asDisplayText(row.productCode).toLowerCase().includes(query)
    );
  }

  return sortByKey(list, sortKey, sortDir, SHIPMENT_KEY_TRANSFORM[sortKey] ?? null);
}

export function getShipmentRowValues(row) {
  const safeRow = row && typeof row === 'object' ? row : {};
  const priceNumber = Number(safeRow.priceWithTax);

  return {
    productCode: asDisplayText(safeRow.productCode, '-'),
    productName: asDisplayText(safeRow.productName, '-'),
    unit: asDisplayText(safeRow.unit, '-'),
    temperature: asDisplayText(safeRow.temperature, '-'),
    taxType: asDisplayText(safeRow.taxType, '-'),
    totalQuantity: asFiniteNumber(safeRow.totalQuantity, 0),
    priceWithTax: Number.isFinite(priceNumber) ? priceNumber : null,
    totalAmount: asFiniteNumber(safeRow.totalAmount, 0),
    productType: asDisplayText(safeRow.productType),
    isManaged: Boolean(safeRow.isManaged),
  };
}

export function getShipmentProductTypeMeta(type) {
  return PRODUCT_TYPE_META[asDisplayText(type)] || PRODUCT_TYPE_META.generic;
}

export function shipmentRowKey(row, page, index) {
  return `${asDisplayText(row?.productCode || row?.productName, 'product')}-${page}-${index}`;
}
