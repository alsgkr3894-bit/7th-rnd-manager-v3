import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildLatestPriceCsvRows,
  filterAndSortLatestRows,
  filterLatestRowsByType,
  getLatestTaxCounts,
  getLatestTypeCounts,
  latestTaxChipStyle,
  PRODUCT_SORT_DIR,
} from '../../components/jette/price-latest/priceLatestViewUtils.js';

const viewSource = readFileSync(resolve('components/jette/PriceLatestView.jsx'), 'utf8');
const listCardSource = readFileSync(
  resolve('components/jette/price-latest/PriceLatestListCard.jsx'),
  'utf8'
);
const filtersSource = readFileSync(
  resolve('components/jette/price-latest/PriceLatestFilters.jsx'),
  'utf8'
);
const tableSource = readFileSync(
  resolve('components/jette/price-latest/PriceLatestTable.jsx'),
  'utf8'
);
const emptySource = readFileSync(
  resolve('components/jette/price-latest/PriceLatestEmptyState.jsx'),
  'utf8'
);
const utilsSource = readFileSync(
  resolve('components/jette/price-latest/priceLatestViewUtils.js'),
  'utf8'
);

describe('price latest view structure', () => {
  test('PriceLatestView delegates empty, list card, filters, table, and helpers', () => {
    expect(viewSource).toContain('<PriceLatestEmptyState');
    expect(viewSource).toContain('<PriceLatestListCard');
    expect(viewSource).toContain('buildLatestPriceCsvRows');
    expect(viewSource).toContain('filterAndSortLatestRows');
    expect(viewSource).toContain('let alive = true;');
    expect(viewSource).toContain('if (!alive) return;');
    expect(viewSource).toContain('alive = false;');
    expect(viewSource).not.toContain('<Chip');
    expect(viewSource).not.toContain('<SearchBox');
    expect(viewSource).not.toContain('<SortableTh');
    expect(viewSource).not.toContain('<table');
    expect(viewSource).not.toContain('<TypeSelect');
    expect(viewSource.split('\n').length).toBeLessThanOrEqual(140);

    expect(listCardSource).toContain('export function PriceLatestListCard');
    expect(listCardSource).toContain('<PriceLatestFilters');
    expect(listCardSource).toContain('<PriceLatestTable');
    expect(filtersSource).toContain('export function PriceLatestFilters');
    expect(filtersSource).toContain('<SearchBox');
    expect(tableSource).toContain('export function PriceLatestTable');
    expect(tableSource).toContain('function PriceLatestRow');
    expect(tableSource).toContain('<SortableTh');
    expect(tableSource).toContain('<TypeSelect');
    expect(emptySource).toContain('export function PriceLatestEmptyState');
    expect(utilsSource).toContain('export function buildLatestPriceCsvRows');
  });

  test('latest price type selector is read-only for viewer role', () => {
    expect(viewSource).toContain('canEdit = false');
    expect(viewSource).toContain('canEdit={canEdit}');
    expect(listCardSource).toContain('canEdit = false');
    expect(listCardSource).toContain('canEdit={canEdit}');
    expect(tableSource).toContain('canEdit = false');
    expect(tableSource).toContain('disabled={!canEdit}');
  });

  test('helpers keep type/tax filters, sorting, CSV rows, and chip style stable', () => {
    const rows = [
      {
        productCode: 'A',
        productName: '치즈',
        taxType: '과세',
        salesUnit: '팩',
        temperature: '냉장',
        price: 1000,
        priceWithTax: 1100,
      },
      {
        productCode: 'B',
        productName: '소스',
        taxType: '면세',
        salesUnit: 'EA',
        temperature: '상온',
        price: 700,
        priceWithTax: 700,
      },
      {
        productCode: 'C',
        productName: '도우',
        taxType: '과세',
        salesUnit: '',
        temperature: '',
        price: 1200,
        priceWithTax: 1320,
      },
    ];
    const lookup = new Map([
      ['A', { productType: 'exclusive' }],
      ['B', { productType: 'generic' }],
      ['C', { productType: 'generic-managed' }],
    ]);

    expect(PRODUCT_SORT_DIR('productName')).toBe('asc');
    expect(PRODUCT_SORT_DIR('price')).toBe('desc');
    expect(getLatestTypeCounts(rows, lookup)).toEqual({
      exclusive: 1,
      generic: 1,
      'generic-managed': 1,
    });
    expect(filterLatestRowsByType(rows, 'generic', lookup).map(row => row.productCode)).toEqual([
      'B',
    ]);
    expect(getLatestTaxCounts(rows)).toEqual({ taxable: 2, exempt: 1 });
    expect(
      filterAndSortLatestRows({
        rows,
        search: '소',
        taxFilter: '면세',
        sortKey: 'price',
        sortDir: 'desc',
      }).map(row => row.productCode)
    ).toEqual(['B']);
    expect(
      filterAndSortLatestRows({
        rows,
        search: '',
        taxFilter: 'all',
        sortKey: 'price',
        sortDir: 'desc',
      }).map(row => row.productCode)
    ).toEqual(['C', 'A', 'B']);
    expect(buildLatestPriceCsvRows(rows.slice(0, 1), lookup)).toEqual([
      ['제품코드', '제품명', '분류', '과세구분', '판매단위', '온도', '단가', '부가세포함가'],
      ['A', '치즈', 'exclusive', '과세', '팩', '냉장', 1000, 1100],
    ]);
    expect(latestTaxChipStyle('과세')).toMatchObject({ background: 'var(--accent-soft)' });
    expect(latestTaxChipStyle('면세')).toMatchObject({ background: 'var(--surface-2)' });
  });
});
