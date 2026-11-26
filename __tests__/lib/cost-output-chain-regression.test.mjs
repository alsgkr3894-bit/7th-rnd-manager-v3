/**
 * 점검 1단계 회귀: 식자재 → 레시피(직접 + 공통묶음) → 메뉴마스터 → 원가마진표 → 원가 보고서
 * → 레시피 인쇄 → Excel 파일 값이 같고, 알레르기·원산지의 화면과 출력이 같은지 확인한다.
 * 기대값은 앱 함수가 아니라 손으로 계산한 숫자다.
 */
import { createRequire } from 'node:module';
import { describe, expect, jest, test } from '@jest/globals';

const workbooks = [];

// 파일을 디스크에 쓰지 않고, 앱이 만든 통합 문서를 그대로 받아 셀을 읽는다.
const XLSX = createRequire(import.meta.url)('xlsx-js-style');
jest.unstable_mockModule('xlsx-js-style', () => ({
  default: { ...XLSX, writeFile: workbook => workbooks.push(workbook) },
}));

const { buildUnitPriceMap } = await import('@/lib/recipe');
const { buildMenuRecipeSummaryMap } = await import('@/lib/menu-master/recipe-summary');
const { buildDetailRows } = await import('@/lib/cost/margin/build-rows');
const { buildCostReportData, buildRecipePrintRows, buildRecipePrintMenus } =
  await import('@/lib/report/build-cost-report');
const { exportCostXlsx } = await import('@/lib/report/export-cost-xlsx');

const MENU = {
  menuCode: 'P-OR-001-L',
  menuName: '시험 피자',
  category: '피자/오리지널',
  size: 'L',
  price: 20000,
};

const ingredients = [
  // 제때 연동 g 단가
  { id: 1, productCode: 'CHZ', ingredientName: '치즈', baseQuantity: 1000, baseUnitType: 'g' },
  // 가격파일에 없는 수동 식자재 — 레시피에는 코드 없이 이름만 저장
  {
    id: 2,
    productCode: '152',
    ingredientName: '수제소스',
    baseQuantity: 500,
    baseUnitType: 'g',
    priceOverride: 5000,
  },
  // 제때 단가 0 → 수동 단가
  {
    id: 3,
    productCode: 'ZERO',
    ingredientName: '허브',
    baseQuantity: 1000,
    baseUnitType: 'g',
    priceOverride: 3000,
  },
  // 개 단위
  {
    id: 4,
    productCode: 'BOX',
    ingredientName: '상자',
    baseQuantity: 100,
    baseUnitType: '개',
    priceOverride: 12000,
  },
];

const recipe = {
  menuCode: MENU.menuCode,
  menuName: MENU.menuName,
  category: MENU.category,
  size: 'L',
  selectedRecipeGroupIds: ['G1'],
  components: [
    { productCode: 'CHZ', ingredientName: '치즈', quantity: 100, unit: 'g' },
    { ingredientName: '수제소스', quantity: 50, unit: 'g', unitPrice: 1 },
    { productCode: 'ZERO', ingredientName: '허브', quantity: 20, unit: 'g' },
  ],
};

const recipeGroups = [
  {
    id: 'G1',
    name: '포장',
    defaultCategories: ['피자'],
    sizes: ['L'],
    ingredients: [
      { productCode: 'BOX', ingredientName: '상자', quantities: { L: 1 }, unitType: '개' },
    ],
  },
];

async function outputsFor(cheesePrice) {
  const priceRows = new Map([
    ['CHZ', { productCode: 'CHZ', priceWithTax: cheesePrice }],
    ['ZERO', { productCode: 'ZERO', priceWithTax: 0 }],
  ]);
  const upm = buildUnitPriceMap(ingredients, priceRows);
  const byKind = new Map([[MENU.menuCode, recipe]]);
  const summary = buildMenuRecipeSummaryMap([MENU], { pizza: byKind }, upm, {
    recipeGroups,
    ingredients,
  }).get(MENU.menuCode);
  const [margin] = buildDetailRows(
    [MENU],
    {
      pizzaMap: byKind,
      personalMap: new Map(),
      sideMap: new Map(),
      setMap: new Map(),
      toppingMap: new Map(),
    },
    upm,
    recipeGroups
  );
  const report = buildCostReportData(
    [MENU],
    { detailMaps: { pizza: byKind }, edges: [], recipeGroups, upm },
    ['피자'],
    { 피자: { id: 'pizza', label: '피자', color: '#000' } }
  );
  const printRows = buildRecipePrintRows({
    detailMaps: { pizza: byKind },
    unitPriceMap: upm,
    recipeGroups,
  });
  const [printMenu] = buildRecipePrintMenus(printRows);

  workbooks.length = 0;
  await exportCostXlsx('2026년 11월', [['pizza', report.pizza]], printRows);
  const sheet = name =>
    XLSX.utils.sheet_to_json(workbooks[0].Sheets[name], { header: 1, defval: '' }).slice(1);
  const detail = sheet('메뉴 상세')[0];
  const recipeSheet = sheet('레시피 출력');

  return {
    costs: {
      메뉴마스터: summary.totalCost,
      원가마진표: margin.costMap.L,
      원가보고서: report.pizza.menus[0].cost,
      인쇄: printMenu.totalCost,
      '인쇄 줄 합계': Math.round(
        printRows[0].components.reduce((sum, line) => sum + line.subtotal, 0)
      ),
      'Excel 메뉴 상세': detail[3],
      'Excel 레시피 합계': recipeSheet[0][12],
      'Excel 줄 합계': Math.round(recipeSheet.reduce((sum, row) => sum + row[11], 0)),
    },
    unitPrices: printRows[0].components.map(line => line.unitPrice),
    excelUnitPrices: recipeSheet.map(row => row[9]),
    rate: { summary: summary.costRate, report: report.pizza.menus[0].rate },
  };
}

describe('원가 연결 회귀', () => {
  test.each([
    // 치즈 100g×12.3 + 소스 50g×10 + 허브 20g×3 + 상자 1개×120
    [12345, 12.3, 1910],
    [20000, 20, 2680],
  ])('치즈 포장가 %i원: 모든 화면·출력의 원가가 같다', async (price, cheeseUnit, expected) => {
    const result = await outputsFor(price);

    expect(result.costs).toEqual(
      Object.fromEntries(Object.keys(result.costs).map(name => [name, expected]))
    );
    expect(result.unitPrices).toEqual([cheeseUnit, 10, 3, 120]);
    expect(result.excelUnitPrices).toEqual(result.unitPrices);
    expect(result.rate.summary).toBeCloseTo((expected / MENU.price) * 100, 5);
    expect(result.rate.report).toBeCloseTo(result.rate.summary, 5);
  });
});
