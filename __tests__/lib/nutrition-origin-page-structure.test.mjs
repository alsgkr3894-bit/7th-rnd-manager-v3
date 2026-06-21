import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/nutrition/origin/page.jsx'), 'utf8');
const summarySource = readFileSync(resolve('app/nutrition/origin/OriginSummaryPanel.jsx'), 'utf8');
const toolbarSource = readFileSync(resolve('app/nutrition/origin/OriginToolbar.jsx'), 'utf8');
const tablePanelSource = readFileSync(resolve('app/nutrition/origin/OriginTablePanel.jsx'), 'utf8');
const ingredientTableSource = readFileSync(
  resolve('app/nutrition/origin/OriginIngredientTable.jsx'),
  'utf8'
);
const menuTableSource = readFileSync(resolve('app/nutrition/origin/OriginMenuTable.jsx'), 'utf8');

describe('nutrition origin page structure', () => {
  test('page delegates summary, toolbar, and table rendering', () => {
    expect(pageSource).toContain('<OriginSummaryPanel');
    expect(pageSource).toContain('<OriginToolbar');
    expect(pageSource).toContain('<OriginTablePanel');
    expect(pageSource).toContain('buildOriginIngredientRows');
    expect(pageSource).toContain('downloadCsv');
    expect(pageSource).toContain('VISIBILITY_REFRESH_MIN_MS');
    expect(pageSource).toContain('useVisibilityRefresh(() => load({ skipIfFresh: true }))');
    expect(pageSource).not.toContain('<SmallStatCard');
    expect(pageSource).not.toContain('<SearchBox');
    expect(pageSource).not.toContain('<table className="data-table">');
    expect(pageSource).not.toContain('원산지 등록 식자재가 없어요');
    expect(pageSource).not.toContain('표시할 메뉴가 없어요');
  });

  test('extracted origin components own focused rendering responsibilities', () => {
    expect(summarySource).toContain('export function OriginSummaryPanel');
    expect(summarySource).toContain('<SmallStatCard');
    expect(summarySource).toContain('원산지 미등록 식자재');
    expect(toolbarSource).toContain('export function OriginToolbar');
    expect(toolbarSource).toContain('<SearchBox');
    expect(toolbarSource).toContain('메뉴 순서 변경');
    expect(tablePanelSource).toContain('export function OriginTablePanel');
    expect(tablePanelSource).toContain('<OriginIngredientTable');
    expect(tablePanelSource).toContain('<OriginMenuTable');
    expect(tablePanelSource).toContain('불러오는 중…');
    expect(ingredientTableSource).toContain('export function OriginIngredientTable');
    expect(ingredientTableSource).toContain('getMenusForIngredient');
    expect(ingredientTableSource).toContain('원산지 등록 식자재가 없어요');
    expect(menuTableSource).toContain('export function OriginMenuTable');
    expect(menuTableSource).toContain('표시할 메뉴가 없어요');
  });
});
