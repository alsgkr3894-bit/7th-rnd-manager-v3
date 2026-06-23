import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { sortByKey } from '@/lib/jette/utils';
import {
  normalizeManagedProductRecord,
  normalizeProductType,
  PRODUCT_TYPE_ORDER,
} from '@/lib/jette/product-types';

export const EMPTY_MANAGED_PRODUCT_FORM = {
  productCode: '',
  productName: '',
  productType: 'generic',
  isManaged: false,
};

export const MANAGED_PRODUCTS_PAGE_SIZE = 50;

export const MANAGED_PRODUCTS_SORT_TRANSFORM = {
  productType: value => PRODUCT_TYPE_ORDER[normalizeProductType(value)] ?? 9,
  enable: value => (value === false ? 0 : 1),
  isManaged: value => (value ? 1 : 0),
};

export function managedProductsSortDir(key) {
  return key === 'productName' || key === 'productCode' ? 'asc' : 'desc';
}

export function countManagedProducts(list = []) {
  const rows = asObjectArray(list).map(normalizeManagedProductRecord);
  return {
    all: rows.length,
    exclusive: rows.filter(product => product.productType === 'exclusive').length,
    generic: rows.filter(product => product.productType === 'generic').length,
    managed: rows.filter(product => product.isManaged).length,
    disabled: rows.filter(product => product.enable === false).length,
  };
}

export function filterManagedProducts(
  list = [],
  {
    filter = 'all',
    managedOnly = false,
    search = '',
    sortKey = 'productName',
    sortDir = 'asc',
  } = {}
) {
  let rows = asObjectArray(list).map(normalizeManagedProductRecord);

  if (filter === 'disabled') rows = rows.filter(product => product.enable === false);
  else if (filter !== 'all') {
    const normalizedFilter = normalizeProductType(filter);
    rows = rows.filter(product => product.productType === normalizedFilter);
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
  const rows = asObjectArray(products).map(product => {
    const normalized = normalizeManagedProductRecord(product);
    return [
      asDisplayText(normalized.productCode),
      asDisplayText(normalized.productName),
      normalized.enable === false ? '비활성' : '활성',
      normalized.productType,
      normalized.isManaged ? 'Y' : '',
    ];
  });

  return [headers, ...rows];
}
