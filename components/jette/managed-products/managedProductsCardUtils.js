import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { sortByKey } from '@/lib/jette/utils';

export const EMPTY_MANAGED_PRODUCT_FORM = {
  productCode: '',
  productName: '',
  productType: 'generic',
  isManaged: false,
};

export const MANAGED_PRODUCTS_PAGE_SIZE = 50;

export const PRODUCT_TYPE_ORDER = { exclusive: 0, generic: 1, 'generic-managed': 2 };

export const MANAGED_PRODUCTS_SORT_TRANSFORM = {
  productType: value => PRODUCT_TYPE_ORDER[value] ?? 9,
  enable: value => (value === false ? 0 : 1),
  isManaged: value => (value ? 1 : 0),
};

export function managedProductsSortDir(key) {
  return key === 'productName' || key === 'productCode' ? 'asc' : 'desc';
}

export function countManagedProducts(list = []) {
  const rows = asObjectArray(list);
  return {
    all: rows.length,
    exclusive: rows.filter(product => product.productType === 'exclusive').length,
    generic: rows.filter(product => product.productType === 'generic' || !product.productType)
      .length,
    'generic-managed': rows.filter(product => product.productType === 'generic-managed').length,
    managed: rows.filter(product => product.isManaged).length,
    disabled: rows.filter(product => product.enable === false).length,
  };
}

export function filterManagedProducts(
  list = [],
  { filter = 'all', managedOnly = false, search = '', sortKey = 'productName', sortDir = 'asc' } = {}
) {
  let rows = asObjectArray(list);

  if (filter === 'disabled') rows = rows.filter(product => product.enable === false);
  else if (filter !== 'all') {
    rows = rows.filter(product => (product.productType || 'generic') === filter);
  }

  if (managedOnly) rows = rows.filter(product => product.isManaged);

  const query = asDisplayText(search).trim().toLowerCase();
  if (query) {
    rows = rows.filter(
      product =>
        asDisplayText(product.productName).toLowerCase().includes(query) ||
        asDisplayText(product.productCode).toLowerCase().includes(query)
    );
  }

  return sortByKey(rows, sortKey, sortDir, MANAGED_PRODUCTS_SORT_TRANSFORM[sortKey] ?? null);
}

export function buildManagedProductsCsvData(products = []) {
  const headers = ['제품코드', '제품명', '활성', '분류', '관리품목'];
  const rows = asObjectArray(products).map(product => [
    asDisplayText(product.productCode),
    asDisplayText(product.productName),
    product.enable === false ? '비활성' : '활성',
    product.productType || 'generic',
    product.isManaged ? 'Y' : '',
  ]);

  return [headers, ...rows];
}

export function buildPriceProductsFromRows(rows = []) {
  return asObjectArray(rows)
    .filter(row => row.productCode && row.productName)
    .map(row => ({ productCode: row.productCode, productName: row.productName }));
}
