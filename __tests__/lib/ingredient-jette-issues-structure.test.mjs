import { readFileSync } from 'fs';
import { resolve } from 'path';

const panelSource = readFileSync(
  resolve('components/ingredient/IngredientJetteIssuesPanel.jsx'),
  'utf8'
);
const pageSource = readFileSync(resolve('app/ingredient/manage/page.jsx'), 'utf8');
const actionsSource = readFileSync(
  resolve('app/ingredient/manage/useIngredientManageActions.js'),
  'utf8'
);
const replaceSource = readFileSync(resolve('lib/ingredient/product-replace.js'), 'utf8');
const ingredientStoreSource = readFileSync(resolve('lib/ingredient/store.js'), 'utf8');

describe('ingredient jette issues structure', () => {
  test('issues panel supports ignoring new jette rows and replacing removed products', () => {
    expect(panelSource).toContain('등록 안함');
    expect(panelSource).toContain('대체 연결');
    expect(panelSource).toContain('replacementRows');
    expect(panelSource).toContain('buildReplacementOptions(newJetteRows, replacementRows)');
    expect(panelSource).toContain("import { ComboBox } from '@/components/ui/ComboBox'");
    expect(panelSource).toContain('<ComboBox');
    expect(panelSource).toContain('placeholder="대체 제품 검색"');
    expect(panelSource).toContain('inputClassName="form-input"');
    expect(panelSource).toContain('replacementOptionFromLabel');
    expect(panelSource).not.toContain('<select');
    expect(panelSource).toContain('onExclude(row)');
    expect(panelSource).toContain('onReplace(row, replacement)');
  });

  test('ingredient manage page wires latest jette rows to replacement action', () => {
    expect(pageSource).toContain('handleReplaceJetteProduct');
    expect(pageSource).toContain('hiddenJetteIssueCodes');
    expect(pageSource).toContain('visibleNewJetteRows');
    expect(pageSource).toContain('visibleJetteRemovedRows');
    expect(pageSource).toContain('handleExcludeJetteIssue');
    expect(pageSource).toContain('next.add(code)');
    expect(pageSource).toContain('next.delete(code)');
    expect(pageSource).toContain('replacementRows={latestPriceRows}');
    expect(pageSource).toContain('onExclude={handleExcludeJetteIssue}');
    expect(pageSource).toContain('onReplace={handleReplaceJetteProduct}');
  });

  test('manage actions delegate product replacement and refresh data after linking', () => {
    expect(actionsSource).toContain('replaceIngredientProductCode');
    expect(actionsSource).toContain('const handleReplaceJetteProduct = useCallback');
    expect(actionsSource).toContain('return true');
    expect(actionsSource).toContain('return false');
    expect(actionsSource).toContain('row?.productCode, replacement');
    expect(actionsSource).toContain('result.menuRecipeUpdated');
    expect(actionsSource).toContain('await load()');
  });

  test('product replacement keeps dependent recipe data on the new product code', () => {
    expect(ingredientStoreSource).toContain('replaceIngredientProductCode');
    expect(ingredientStoreSource).toContain('previewIngredientProductReplace');
    expect(replaceSource).toContain('export async function replaceIngredientProductCode');
    expect(replaceSource).toContain("'menu_recipes'");
    expect(replaceSource).toContain("'cost_recipe_groups'");
    expect(replaceSource).toContain("'cost_edge_dough'");
    expect(replaceSource).toContain('replacedByProductCode');
    expect(replaceSource).toContain('replaceProductCodeInComponents');
    expect(replaceSource).toContain('replaceProductCodeInIngredientLines');
  });
});
