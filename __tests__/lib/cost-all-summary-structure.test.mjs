import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildAllSummaryCategories,
  buildAllSummaryStats,
  filterAllSummaryRows,
} from '../../app/cost/all-summary/allSummaryUtils.js';

const pageSource = readFileSync(resolve('app/cost/all-summary/page.jsx'), 'utf8');
const dataSource = readFileSync(resolve('app/cost/all-summary/allSummaryData.js'), 'utf8');
const utilsSource = readFileSync(resolve('app/cost/all-summary/allSummaryUtils.js'), 'utf8');
const statsSource = readFileSync(
  resolve('app/cost/all-summary/components/AllSummaryStats.jsx'),
  'utf8'
);
const filterSource = readFileSync(
  resolve('app/cost/all-summary/components/AllSummaryCategoryFilter.jsx'),
  'utf8'
);
const tableSource = readFileSync(
  resolve('app/cost/all-summary/components/AllSummaryTable.jsx'),
  'utf8'
);
const loadingSource = readFileSync(
  resolve('app/cost/all-summary/components/AllSummaryLoadingSkeleton.jsx'),
  'utf8'
);
const emptySource = readFileSync(
  resolve('app/cost/all-summary/components/AllSummaryEmptyState.jsx'),
  'utf8'
);
const noticeSource = readFileSync(
  resolve('app/cost/all-summary/components/AllSummaryRecipeNotice.jsx'),
  'utf8'
);
const errorSource = readFileSync(
  resolve('app/cost/all-summary/components/AllSummaryError.jsx'),
  'utf8'
);

describe('cost all summary helpers', () => {
  test('stats helper counts recipe rows, average rate, and alert rows', () => {
    expect(
      buildAllSummaryStats([
        { hasCost: true, costRate: 20 },
        { hasCost: true, costRate: 50 },
        { hasCost: false, costRate: null },
      ])
    ).toEqual({
      total: 3,
      withCost: 2,
      avgRate: 35,
      alertCnt: 1,
    });
  });

  test('category and filter helpers keep display order and 전체 fallback', () => {
    const rows = [{ category: '사이드' }, { category: '피자' }, { category: '미분류' }];

    expect(buildAllSummaryCategories(rows)).toEqual(['전체', '피자', '사이드', '기타']);
    expect(filterAllSummaryRows(rows, '전체')).toBe(rows);
    expect(filterAllSummaryRows(rows, '피자')).toEqual([{ category: '피자' }]);
  });
});

describe('cost all summary structure', () => {
  test('page delegates data loading, stats, filters, states, and table rendering', () => {
    expect(pageSource).toContain('export default function Page');
    expect(pageSource).toContain('loadAllSummaryRows()');
    expect(pageSource).toContain('buildAllSummaryStats(rows)');
    expect(pageSource).toContain('buildAllSummaryCategories(rows)');
    expect(pageSource).toContain('filterAllSummaryRows(rows, catFilter)');
    expect(pageSource).toContain('<AllSummaryStats');
    expect(pageSource).toContain('<AllSummaryCategoryFilter');
    expect(pageSource).toContain('<AllSummaryLoadingSkeleton');
    expect(pageSource).toContain('<AllSummaryEmptyState');
    expect(pageSource).toContain('<AllSummaryRecipeNotice');
    expect(pageSource).toContain('<AllSummaryTable');
    expect(pageSource).not.toContain('buildUnitPriceMap');
    expect(pageSource).not.toContain('buildRows(');
    expect(pageSource).not.toContain('CAT_ORDER');
    expect(pageSource).not.toContain('costRateColor');
    expect(pageSource).not.toContain('<table');
    expect(pageSource).not.toContain('레시피 미등록');
  });

  test('split all-summary files own loader, helper, and rendering responsibilities', () => {
    expect(dataSource).toContain('export async function loadAllSummaryRows');
    expect(dataSource).toContain('buildUnitPriceMap');
    expect(dataSource).toContain('buildRows(allMenuPrices');
    expect(dataSource).toContain('sortAllSummaryRows(rows)');
    expect(dataSource).toContain('getMenuCodeRank');

    expect(utilsSource).toContain('export function exportAllSummaryCsv');
    expect(utilsSource).toContain('downloadCsv');
    expect(utilsSource).toContain('export function buildAllSummaryStats');
    expect(utilsSource).toContain('export function buildAllSummaryCategories');
    expect(utilsSource).toContain('export function filterAllSummaryRows');

    expect(statsSource).toContain('export function AllSummaryStats');
    expect(statsSource).toContain('costRateColor');
    expect(filterSource).toContain('export function AllSummaryCategoryFilter');
    expect(filterSource).toContain(
      "className={'chip' + (activeCategory === category ? ' active' : '')}"
    );
    expect(tableSource).toContain('export function AllSummaryTable');
    expect(tableSource).toContain('function AllSummaryTableRow');
    expect(tableSource).toContain('<Pagination');
    expect(tableSource).toContain('MENU_MASTER_ROUTE');
    expect(tableSource).toContain('레시피 미등록');
    expect(loadingSource).toContain('export function AllSummaryLoadingSkeleton');
    expect(emptySource).toContain('export function AllSummaryEmptyState');
    expect(noticeSource).toContain('export function AllSummaryRecipeNotice');
    expect(errorSource).toContain('export function AllSummaryError');
  });
});
