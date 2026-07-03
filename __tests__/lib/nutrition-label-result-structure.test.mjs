import { readFileSync } from 'fs';
import { resolve } from 'path';

const resultSource = readFileSync(resolve('app/nutrition/export/NutritionLabelResult.jsx'), 'utf8');
const controlsSource = readFileSync(
  resolve('app/nutrition/export/NutritionLabelControls.jsx'),
  'utf8'
);
const commonControlsSource = readFileSync(
  resolve('app/nutrition/export/ExportResultControls.jsx'),
  'utf8'
);
const tablesSource = readFileSync(resolve('app/nutrition/export/NutritionLabelTables.jsx'), 'utf8');
const pizzaTableSource = readFileSync(
  resolve('app/nutrition/export/label-tables/PizzaNutritionTable.jsx'),
  'utf8'
);
const pizzaSliceTableSource = readFileSync(
  resolve('app/nutrition/export/label-tables/PizzaSliceNutritionTable.jsx'),
  'utf8'
);
const simpleTableSource = readFileSync(
  resolve('app/nutrition/export/label-tables/SimpleNutritionTable.jsx'),
  'utf8'
);
const setHalfTableSource = readFileSync(
  resolve('app/nutrition/export/label-tables/SetHalfNutritionTable.jsx'),
  'utf8'
);
const tablePrimitivesSource = readFileSync(
  resolve('app/nutrition/export/label-tables/NutritionLabelTablePrimitives.jsx'),
  'utf8'
);

describe('nutrition label result structure', () => {
  test('NutritionLabelResult keeps data loading and delegates controls and table rendering', () => {
    expect(resultSource).toContain('<NutritionLabelTabs');
    expect(resultSource).toContain('<NutritionLabelActions');
    expect(resultSource).toContain('<PizzaViewControls');
    expect(resultSource).toContain('<NutritionLabelTabContent');
    expect(resultSource).toContain('buildPizzaSheet(ctx)');
    expect(resultSource).toContain('exportNutritionLabelToExcel');
    expect(resultSource).toContain('printNutritionLabelAll');
    expect(resultSource).not.toContain('const SUB_TABS');
    expect(resultSource).not.toContain('function PizzaTable');
    expect(resultSource).not.toContain('function PizzaSliceTable');
    expect(resultSource).not.toContain('function SimpleTable');
    expect(resultSource).not.toContain('function SetHalfTable');
    expect(resultSource).not.toContain('const BEVERAGE_COLS');
  });

  test('nutrition label allergen and origin mapping include derived menu compositions', () => {
    const mapCalls = [...resultSource.matchAll(/buildIngredientMenuMap\(\{[\s\S]*?\}\)/g)].map(
      match => match[0]
    );

    expect(mapCalls.length).toBeGreaterThanOrEqual(2);
    expect(mapCalls[0]).toContain('edges: []');
    expect(mapCalls[0]).toContain('compositions');
    expect(mapCalls[1]).toContain('edges: costEdges');
    expect(mapCalls[1]).toContain('compositions');
  });

  test('nutrition label controls and tables own presentation details', () => {
    expect(controlsSource).toContain('export const NUTRITION_LABEL_TABS');
    expect(controlsSource).toContain('export function NutritionLabelTabs');
    expect(controlsSource).toContain('export function NutritionLabelActions');
    expect(controlsSource).toContain('export function PizzaViewControls');
    expect(controlsSource).toContain('<ExportResultLoading');
    expect(controlsSource).toContain('<ExportResultTabs');
    expect(controlsSource).toContain('<ExportResultActions');
    expect(commonControlsSource).toContain('export function ExportResultLoading');
    expect(commonControlsSource).toContain('export function ExportResultTabs');
    expect(commonControlsSource).toContain('export function ExportResultActions');
    expect(commonControlsSource).toContain('PDF 통합 출력');
    expect(commonControlsSource).toContain('엑셀 통합 다운로드');
    expect(tablesSource).toContain('export function NutritionLabelTabContent');
    expect(tablesSource).toContain('<PizzaNutritionTable');
    expect(tablesSource).toContain('<PizzaSliceNutritionTable');
    expect(tablesSource).toContain('<SimpleNutritionTable');
    expect(tablesSource).toContain('<SetHalfNutritionTable');
    expect(tablesSource).toContain('const BEVERAGE_COLS');
    expect(tablesSource).not.toContain('function PizzaTable');
    expect(tablesSource).not.toContain('function PizzaSliceTable');
    expect(tablesSource).not.toContain('function SimpleTable');
    expect(tablesSource).not.toContain('function SetHalfTable');

    expect(pizzaTableSource).toContain('export function PizzaNutritionTable');
    expect(pizzaTableSource).toContain('영양성분표 (피자) — 150g 기준');
    expect(pizzaTableSource).toContain('GroupedMenuNameCell');
    expect(pizzaSliceTableSource).toContain('export function PizzaSliceNutritionTable');
    expect(pizzaSliceTableSource).toContain('NUTRITION_COLUMNS');
    expect(pizzaSliceTableSource).toContain('1회제공');
    expect(simpleTableSource).toContain('export function SimpleNutritionTable');
    expect(simpleTableSource).toContain('NutritionLabelColumnHeader');
    expect(setHalfTableSource).toContain('export function SetHalfNutritionTable');
    expect(setHalfTableSource).toContain('영양성분표 (세트박스·하프앤하프)');
    expect(setHalfTableSource).toContain('입력 총중량 기준');
    expect(setHalfTableSource).not.toContain('150g 기준');
    expect(tablePrimitivesSource).toContain('export function NutritionValueText');
    expect(tablePrimitivesSource).toContain('export function NutritionLabelEmpty');
    expect(tablePrimitivesSource).toContain('export function GroupedMenuNameCell');
  });
});
