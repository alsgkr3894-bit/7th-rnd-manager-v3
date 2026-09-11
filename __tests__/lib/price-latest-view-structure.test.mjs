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
const kpiSource = readFileSync(resolve('components/jette/PriceLatestKpi.jsx'), 'utf8');
const changeCardSource = readFileSync(
  resolve('components/jette/price-latest/PriceLatestChangeCard.jsx'),
  'utf8'
);
const changeSummaryHookSource = readFileSync(
  resolve('components/jette/price-latest/usePriceLatestChangeSummary.js'),
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

  // 회귀: 직전 단가파일 대비 인상/인하/신규/삭제를 KPI + 변동 제품 카드로 보여준다.
  // "직전 파일" 계산·비교는 훅 하나에 위임해 PriceLatestView.jsx가 140줄을 넘지 않게 한다.
  test('직전 파일 대비 변동은 전용 훅과 카드로 위임한다', () => {
    expect(viewSource).toContain("from './price-latest/usePriceLatestChangeSummary'");
    expect(viewSource).toContain('usePriceLatestChangeSummary(files, latestFileId, rows)');
    expect(viewSource).toContain('<PriceLatestChangeCard');
    expect(viewSource).toContain('prevFile={prevFile}');
    expect(viewSource.split('\n').length).toBeLessThanOrEqual(140);

    expect(changeSummaryHookSource).toContain('export function usePriceLatestChangeSummary');
    expect(changeSummaryHookSource).toContain('comparePriceLists');
    expect(changeSummaryHookSource).toContain('summarizePriceChanges');

    expect(kpiSource).toContain('직전 대비 변동');
    expect(kpiSource).toContain('비교할 이전 파일이 없습니다');
    expect(kpiSource).toContain('priceChangeSummary?.up');

    expect(changeCardSource).toContain('export function PriceLatestChangeCard');
    expect(changeCardSource).toContain('PriceCompareStatusChip');
    expect(changeCardSource).toContain('직전 파일과 단가 차이가 없습니다');
    // 계산 로직을 다시 구현하지 않고 summary(=summarizePriceChanges 결과)를 그대로 받는다.
    expect(changeCardSource).not.toContain('function summarizePriceChanges');
    expect(changeCardSource).not.toContain('function comparePriceLists');
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
      generic: 2,
    });
    expect(filterLatestRowsByType(rows, 'generic', lookup).map(row => row.productCode)).toEqual([
      'B',
      'C',
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
