import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/ingredient/usage/page.jsx'), 'utf8');
const dashboardSource = readFileSync(
  resolve('components/ingredient/usage/IngredientUsageDashboard.jsx'),
  'utf8'
);
const statsSource = readFileSync(
  resolve('components/ingredient/usage/IngredientUsageStats.jsx'),
  'utf8'
);
const controlsSource = readFileSync(
  resolve('components/ingredient/usage/IngredientUsageControls.jsx'),
  'utf8'
);
const tableSource = readFileSync(
  resolve('components/ingredient/usage/IngredientUsageTable.jsx'),
  'utf8'
);
const tableHeaderSource = readFileSync(
  resolve('components/ingredient/usage/table/IngredientUsageTableHeader.jsx'),
  'utf8'
);
const tableRowSource = readFileSync(
  resolve('components/ingredient/usage/table/IngredientUsageTableRow.jsx'),
  'utf8'
);
const menuChipsSource = readFileSync(
  resolve('components/ingredient/usage/table/UsageMenuChips.jsx'),
  'utf8'
);
const emptyStateSource = readFileSync(
  resolve('components/ingredient/usage/table/IngredientUsageEmptyState.jsx'),
  'utf8'
);
const displayUtilsSource = readFileSync(
  resolve('components/ingredient/usage/usage-display-utils.js'),
  'utf8'
);

describe('ingredient usage page structure', () => {
  test('page delegates usage display UI to the dashboard component', () => {
    expect(pageSource).toContain('IngredientUsageDashboard');
    expect(pageSource).toContain('useIngredientUsageRows');
    expect(pageSource).toContain('downloadCsv');
    expect(pageSource).not.toContain('SortableTh');
    expect(pageSource).not.toContain('SearchBox');
    expect(pageSource).not.toContain('printUsageReport');
    expect(pageSource).not.toContain('<table className="data-table">');

    expect(dashboardSource).toContain('export function IngredientUsageDashboard');
    expect(dashboardSource).toContain('<IngredientUsageStats');
    expect(dashboardSource).toContain('<IngredientUsageControls');
    expect(dashboardSource).toContain('<IngredientUsageExcludedMenus');
    expect(dashboardSource).toContain('<IngredientUsageTable');
    expect(dashboardSource).not.toContain('SortableTh');
    expect(dashboardSource).not.toContain('SearchBox');
    expect(dashboardSource).not.toContain('printUsageReport');
    expect(dashboardSource).not.toContain('<table className="data-table">');

    expect(statsSource).toContain('export function IngredientUsageStats');
    expect(statsSource).toContain('1개 메뉴만 사용');
    expect(controlsSource).toContain('export function IngredientUsageControls');
    expect(controlsSource).toContain('SearchBox');
    expect(controlsSource).toContain('printUsageReport');
    expect(controlsSource).toContain('export function IngredientUsageExcludedMenus');
    expect(tableSource).toContain('export function IngredientUsageTable');
    expect(tableSource).toContain('IngredientUsageTableHeader');
    expect(tableSource).toContain('IngredientUsageTableRow');
    expect(tableSource).toContain('IngredientUsageTableFooter');
    expect(tableSource).toContain('<table className="data-table">');
    expect(tableSource).not.toContain('TIER_LABEL');
    expect(tableSource).not.toContain('CAT_COLORS');

    expect(tableHeaderSource).toContain('SortableTh');
    expect(tableRowSource).toContain('export function IngredientUsageTableRow');
    expect(tableRowSource).toContain('UsageMenuChips');
    expect(tableRowSource).toContain('MenuTypeCounts');
    expect(tableRowSource).toContain('TIER_LABEL');
    expect(menuChipsSource).toContain('CAT_COLORS');
    expect(menuChipsSource).toContain('onExcludeMenu(menu.menuName)');
    expect(emptyStateSource).toContain('조건에 맞는 미사용 식자재가 없습니다.');

    expect(displayUtilsSource).toContain('export const USAGE_CATS');
    expect(displayUtilsSource).toContain('export function usageCountStyle');
  });
});
