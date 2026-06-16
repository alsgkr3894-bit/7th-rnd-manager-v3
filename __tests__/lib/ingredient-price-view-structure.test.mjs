import { readFileSync } from 'fs';
import { resolve } from 'path';

const viewSource = readFileSync(
  resolve('components/cost/ingredient-price/IngredientPriceView.jsx'),
  'utf8'
);
const actionsSource = readFileSync(
  resolve('components/cost/ingredient-price/IngredientPriceActions.jsx'),
  'utf8'
);
const tabsSource = readFileSync(
  resolve('components/cost/ingredient-price/IngredientPriceTabs.jsx'),
  'utf8'
);
const issuesSource = readFileSync(
  resolve('components/cost/ingredient-price/IngredientPriceIssuesPanel.jsx'),
  'utf8'
);
const listSource = readFileSync(
  resolve('components/cost/ingredient-price/IngredientPriceListPanel.jsx'),
  'utf8'
);
const listFiltersSource = readFileSync(
  resolve('components/cost/ingredient-price/list-panel/IngredientPriceFilters.jsx'),
  'utf8'
);
const listStatsSource = readFileSync(
  resolve('components/cost/ingredient-price/list-panel/IngredientPriceStats.jsx'),
  'utf8'
);
const listTableSource = readFileSync(
  resolve('components/cost/ingredient-price/list-panel/IngredientPriceTable.jsx'),
  'utf8'
);
const listFileInfoSource = readFileSync(
  resolve('components/cost/ingredient-price/list-panel/IngredientPriceFileInfo.jsx'),
  'utf8'
);

describe('ingredient price view structure', () => {
  test('IngredientPriceView keeps data and action orchestration while delegating panels', () => {
    expect(viewSource).toContain('<IngredientPriceHeaderActions');
    expect(viewSource).toContain('<IngredientPriceEmbeddedActions');
    expect(viewSource).toContain('<IngredientPriceTabs');
    expect(viewSource).toContain('<IngredientPriceIssuesPanel');
    expect(viewSource).toContain('<IngredientPriceListPanel');
    expect(viewSource).toContain('useIngredientPriceData()');
    expect(viewSource).toContain('useIngredientPriceFilters(rows)');
    expect(viewSource).toContain('useCostManageTable(filtered');
    expect(viewSource).not.toContain('className="stat-row"');
    expect(viewSource).not.toContain('분류·포장단위·가격 중 하나 이상이 없는 항목');
    expect(viewSource).not.toContain('<SortableHeader');
  });

  test('split ingredient price components own their presentation details', () => {
    expect(actionsSource).toContain('export function IngredientPriceHeaderActions');
    expect(actionsSource).toContain('제때 수량 동기화');
    expect(tabsSource).toContain('export function IngredientPriceTabs');
    expect(tabsSource).toContain('issueCount');
    expect(issuesSource).toContain('export function IngredientPriceIssuesPanel');
    expect(issuesSource).toContain('미연동');
    expect(listSource).toContain('export function IngredientPriceListPanel');
    expect(listSource).toContain('<IngredientPriceFileInfo');
    expect(listSource).toContain('<IngredientPriceStats');
    expect(listSource).toContain('<IngredientPriceFilters');
    expect(listSource).toContain('<IngredientPriceTable');
    expect(listSource).not.toContain('<MasterRow');
    expect(listSource).not.toContain('<SelectionToolbar');
    expect(listSource).not.toContain('<SortableHeader');
    expect(listSource.split('\n').length).toBeLessThanOrEqual(70);

    expect(listFileInfoSource).toContain('export function IngredientPriceFileInfo');
    expect(listFileInfoSource).toContain('기준 파일');
    expect(listStatsSource).toContain('export function IngredientPriceStats');
    expect(listStatsSource).toContain('단가 인상');
    expect(listFiltersSource).toContain('export function IngredientPriceFilters');
    expect(listFiltersSource).toContain('<SelectionToolbar');
    expect(listTableSource).toContain('export function IngredientPriceTable');
    expect(listTableSource).toContain('<MasterRow');
    expect(listTableSource).toContain('<SortableHeader');
  });
});
