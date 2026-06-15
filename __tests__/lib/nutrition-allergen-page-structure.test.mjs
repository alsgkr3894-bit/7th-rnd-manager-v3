import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/nutrition/allergen/page.jsx'), 'utf8');
const dataHookSource = readFileSync(
  resolve('app/nutrition/allergen/useAllergenPageData.js'),
  'utf8'
);
const dataUtilsSource = readFileSync(
  resolve('app/nutrition/allergen/allergenPageDataUtils.js'),
  'utf8'
);
const sourceHookSource = readFileSync(
  resolve('app/nutrition/allergen/useAllergenSourceData.js'),
  'utf8'
);
const ingredientTableSource = readFileSync(
  resolve('app/nutrition/allergen/AllergenIngredientTable.jsx'),
  'utf8'
);
const matrixTableSource = readFileSync(
  resolve('app/nutrition/allergen/AllergenMenuMatrixTable.jsx'),
  'utf8'
);
const detailModalSource = readFileSync(
  resolve('app/nutrition/allergen/AllergenDetailModal.jsx'),
  'utf8'
);
const headerSource = readFileSync(resolve('app/nutrition/allergen/AllergenPageHeader.jsx'), 'utf8');
const summarySource = readFileSync(
  resolve('app/nutrition/allergen/AllergenSummaryPanel.jsx'),
  'utf8'
);
const toolbarSource = readFileSync(resolve('app/nutrition/allergen/AllergenToolbar.jsx'), 'utf8');
const tablePanelSource = readFileSync(
  resolve('app/nutrition/allergen/AllergenTablePanel.jsx'),
  'utf8'
);

describe('nutrition allergen page structure', () => {
  test('page delegates header, summary, toolbar, table, and detail modal rendering', () => {
    expect(pageSource).toContain('<AllergenPageHeader');
    expect(pageSource).toContain('<AllergenSummaryPanel');
    expect(pageSource).toContain('<AllergenToolbar');
    expect(pageSource).toContain('<AllergenTablePanel');
    expect(pageSource).toContain('<AllergenDetailModal');
    expect(pageSource).toContain('useAllergenPageData');
    expect(pageSource).not.toContain('<PageHeader');
    expect(pageSource).not.toContain('<SearchBox');
    expect(pageSource).not.toContain('<SmallStatCard');
    expect(pageSource).not.toContain('한국 법정 알레르기 22종');
    expect(pageSource).not.toContain('불러오는 중…');
    expect(pageSource).not.toContain('getMenusForIngredient');
    expect(pageSource).not.toContain('title="식자재 알레르기 상세 보기"');
    expect(pageSource).not.toContain('<ModalFrame');
    expect(pageSource).not.toContain('getAllIngredients');
    expect(pageSource).not.toContain('buildMenuMatrix');
    expect(pageSource).not.toContain('useVisibilityRefresh');
    expect(pageSource).not.toContain('useMounted');
    expect(pageSource).not.toContain('extractExcludedMenuSets');
    expect(pageSource).not.toContain('buildDetailRows');
    expect(pageSource).not.toContain('downloadCsv');
  });

  test('extracted components own their focused rendering responsibilities', () => {
    expect(headerSource).toContain('export function AllergenPageHeader');
    expect(headerSource).toContain('<PageHeader');
    expect(headerSource).toContain('엑셀로 내보내기');
    expect(summarySource).toContain('export function AllergenSummaryPanel');
    expect(summarySource).toContain('<SmallStatCard');
    expect(summarySource).toContain('한국 법정 알레르기 22종');
    expect(toolbarSource).toContain('export function AllergenToolbar');
    expect(toolbarSource).toContain('<SearchBox');
    expect(toolbarSource).toContain('메뉴명 편집');
    expect(tablePanelSource).toContain('export function AllergenTablePanel');
    expect(tablePanelSource).toContain('<AllergenIngredientTable');
    expect(tablePanelSource).toContain('<AllergenMenuMatrixTable');
    expect(tablePanelSource).toContain('불러오는 중…');
    expect(ingredientTableSource).toContain('export function AllergenIngredientTable');
    expect(ingredientTableSource).toContain('getMenusForIngredient');
    expect(ingredientTableSource).toContain('알레르기 등록 식자재가 없어요');
    expect(matrixTableSource).toContain('export function AllergenMenuMatrixTable');
    expect(matrixTableSource).toContain('title="식자재 알레르기 상세 보기"');
    expect(matrixTableSource).toContain('표시할 메뉴가 없어요');
    expect(detailModalSource).toContain('export function AllergenDetailModal');
    expect(detailModalSource).toContain('<ModalFrame');
    expect(detailModalSource).toContain('상세 식자재가 없습니다');
  });

  test('extracted data hook composes source data and delegates page derivations', () => {
    expect(dataHookSource).toContain('export function useAllergenPageData');
    expect(dataHookSource).toContain('useAllergenSourceData()');
    expect(dataHookSource).toContain('buildMenuMatrix');
    expect(dataHookSource).toContain('extractExcludedMenuSets');
    expect(dataHookSource).toContain('buildDetailRows');
    expect(dataHookSource).toContain('buildAllergenCsvRows(menuMatrix, orderedAllergens)');
    expect(dataHookSource).toContain('downloadCsv(buildAllergenCsvRows');
    expect(dataHookSource).toContain('saveOrder(ALLERGEN_MENU_ORDER_KEY, keys)');
    expect(dataHookSource).toContain('saveMenuNames(next)');
    expect(dataHookSource).not.toContain('ALLERGEN_SEED');
    expect(dataHookSource).not.toContain("const headers = ['메뉴명'");
    expect(dataHookSource).not.toContain('const frequency = new Map()');
    expect(dataHookSource).not.toContain('getAllIngredients');
    expect(dataHookSource).not.toContain('useVisibilityRefresh');
    expect(dataHookSource).not.toContain('buildIngredientMenuMap');
  });

  test('page data utils own allergen filtering, order derivation, and csv row building', () => {
    expect(dataUtilsSource).toContain('export function filterAllergenIngredients');
    expect(dataUtilsSource).toContain('export function filterIngredientRows');
    expect(dataUtilsSource).toContain('export function orderAllergens');
    expect(dataUtilsSource).toContain('export function filterMenuMatrix');
    expect(dataUtilsSource).toContain('export function buildAllergenCsvRows');
    expect(dataUtilsSource).toContain('ALLERGEN_SEED');
    expect(dataUtilsSource).toContain('const headers = [');
    expect(dataUtilsSource).toContain("'메뉴명'");
    expect(dataUtilsSource).toContain("'크러스트'");
    expect(dataUtilsSource).toContain('const frequency = new Map()');
  });

  test('extracted source hook owns db loading and recipe map building responsibilities', () => {
    expect(sourceHookSource).toContain('export function useAllergenSourceData');
    expect(sourceHookSource).toContain('getAllIngredients');
    expect(sourceHookSource).toContain('getAllMenuMaster');
    expect(sourceHookSource).toContain('loadMenuRecipeArrays');
    expect(sourceHookSource).toContain('tagDetailRecipes');
    expect(sourceHookSource).toContain('buildIngredientMenuMap');
    expect(sourceHookSource).toContain('useVisibilityRefresh(load)');
    expect(sourceHookSource).toContain("showToast('데이터 로드 실패: ' + err.message, 'error')");
  });
});
