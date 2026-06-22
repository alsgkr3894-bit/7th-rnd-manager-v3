import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildManagedProductsCsvData,
  buildPriceProductsFromRows,
  countManagedProducts,
  filterManagedProducts,
  managedProductsSortDir,
} from '../../components/jette/managed-products/managedProductsCardUtils.js';

const cardSource = readFileSync(resolve('components/jette/ManagedProductsCard.jsx'), 'utf8');
const headerSource = readFileSync(
  resolve('components/jette/managed-products/ManagedProductsCardHeader.jsx'),
  'utf8'
);
const filtersSource = readFileSync(
  resolve('components/jette/managed-products/ManagedProductsFilters.jsx'),
  'utf8'
);
const tableSource = readFileSync(
  resolve('components/jette/managed-products/ManagedProductsTable.jsx'),
  'utf8'
);
const formSource = readFileSync(resolve('components/jette/ManagedProductsForm.jsx'), 'utf8');
const rowSource = readFileSync(resolve('components/jette/ManagedProductsRow.jsx'), 'utf8');
const utilsSource = readFileSync(
  resolve('components/jette/managed-products/managedProductsCardUtils.js'),
  'utf8'
);

describe('managed products card structure', () => {
  test('ManagedProductsCard delegates header, filters, table, and helpers', () => {
    expect(cardSource).toContain('<ManagedProductsCardHeader');
    expect(cardSource).toContain('<ManagedProductsFilters');
    expect(cardSource).toContain('<ManagedProductsTable');
    expect(cardSource).toContain('filterManagedProducts');
    expect(cardSource).toContain('buildManagedProductsCsvData');
    expect(cardSource).not.toContain('<Chip');
    expect(cardSource).not.toContain('<SortableTh');
    expect(cardSource).not.toContain('<EmptyState');
    expect(cardSource).not.toContain('const headers');
    expect(cardSource.split('\n').length).toBeLessThanOrEqual(240);

    expect(headerSource).toContain('export function ManagedProductsCardHeader');
    expect(headerSource).toContain('가격비교에서 전용상품 가져오기');
    expect(filtersSource).toContain('export function ManagedProductsFilters');
    expect(filtersSource).toContain('관리품목만');
    expect(tableSource).toContain('export function ManagedProductsTable');
    expect(tableSource).toContain('<ManagedProductsRow');
    expect(tableSource).toContain('<SortableTh');
    expect(tableSource).toContain('MANAGED_PRODUCTS_PAGE_SIZE');
    expect(utilsSource).toContain('export function filterManagedProducts');
  });

  test('managed product write controls follow current role', () => {
    expect(cardSource).toContain("from '@/hooks/useCurrentRole'");
    expect(cardSource).toContain('const canEdit = roleReady && isAdmin');
    expect(cardSource).toContain('if (!canEdit) return');
    expect(cardSource).toContain('canEdit={canEdit}');
    expect(headerSource).toContain('canEdit = false');
    expect(headerSource).toContain('disabled={!canEdit');
    expect(formSource).toContain('canEdit = false');
    expect(formSource).toContain('disabled={!canEdit}');
    expect(tableSource).toContain('canEdit = false');
    expect(tableSource).toContain('canEdit={canEdit}');
    expect(rowSource).toContain('canEdit = false');
    expect(rowSource).toContain('disabled={!canEdit}');
    expect(rowSource).toContain('canEdit && pendingDelete');
  });

  test('helpers keep counts, filters, CSV rows, and migration rows stable', () => {
    const products = [
      { id: 1, productCode: 'A', productName: '치즈', productType: 'exclusive', isManaged: true },
      { id: 2, productCode: 'B', productName: '소스', productType: 'generic', enable: false },
      {
        id: 3,
        productCode: 'C',
        productName: '박스',
        productType: 'generic-managed',
        isManaged: true,
      },
      { id: 4, productCode: 'D', productName: '도우' },
    ];

    expect(countManagedProducts(products)).toEqual({
      all: 4,
      exclusive: 1,
      generic: 2,
      'generic-managed': 1,
      managed: 2,
      disabled: 1,
    });
    expect(
      filterManagedProducts(products, { filter: 'exclusive' }).map(product => product.id)
    ).toEqual([1]);
    expect(
      filterManagedProducts(products, { filter: 'generic' }).map(product => product.id)
    ).toEqual([4, 2]);
    expect(
      filterManagedProducts(products, { managedOnly: true }).map(product => product.id)
    ).toEqual([3, 1]);
    expect(filterManagedProducts(products, { search: '소스' }).map(product => product.id)).toEqual([
      2,
    ]);
    expect(
      filterManagedProducts(products, { sortKey: 'enable', sortDir: 'asc' }).map(
        product => product.id
      )
    ).toEqual([2, 1, 3, 4]);
    expect(managedProductsSortDir('productCode')).toBe('asc');
    expect(managedProductsSortDir('enable')).toBe('desc');
    expect(buildManagedProductsCsvData(products.slice(0, 2))).toEqual([
      ['제품코드', '제품명', '활성', '분류', '관리품목'],
      ['A', '치즈', '활성', 'exclusive', 'Y'],
      ['B', '소스', '비활성', 'generic', ''],
    ]);
    expect(
      buildPriceProductsFromRows([
        { productCode: 'A', productName: '치즈' },
        { productCode: '', productName: '제외' },
        { productCode: 'B' },
      ])
    ).toEqual([{ productCode: 'A', productName: '치즈' }]);
  });
});
