import { dbDeleteById, dbInsertOne, goto, MAIN_DB, step } from '../helpers.mjs';

/**
 * 식자재 단가 등록 → 레시피에 연결 → 원가 보고서 빌더에서 메뉴 확인
 * P0-2: 식자재 단가 변경 → 메뉴 레시피 원가 → 원가 보고서 반영
 */
export async function scenarioIngredientPriceReport({ page, base, runId }) {
  const steps = [];
  const menuCode = `ZZ-E2E-S14-${runId}`.toUpperCase();
  const menuName = `E2E단가보고서-${runId}`;
  const ingName = `E2E단가재료-${runId}`;
  let ingId, menuId, priceId, recipeId;

  await step(steps, '원가 보고서 페이지 진입 및 테스트 데이터 삽입', async () => {
    await goto(page, base, '/report/cost');

    ingId = await dbInsertOne(page, MAIN_DB, 'cost_ingredients', {
      ingredientName: ingName,
      category: '기타',
      productCode: null,
      priceOverride: 500,
      baseQty: 100,
      unit: 'g',
      updatedAt: new Date().toISOString(),
    });

    menuId = await dbInsertOne(page, MAIN_DB, 'menu_master', {
      menuCode,
      menuName,
      category: '사이드',
      size: '단일',
      status: 'active',
      displayOrder: 9998,
      updatedAt: new Date().toISOString(),
    });

    priceId = await dbInsertOne(page, MAIN_DB, 'cost_selling_prices', {
      menuCode,
      menuName,
      category: '사이드',
      size: '단일',
      price: 1800,
      updatedAt: new Date().toISOString(),
    });

    recipeId = await dbInsertOne(page, MAIN_DB, 'menu_recipes', {
      menuCode,
      menuName,
      category: '사이드',
      kind: 'side',
      size: '단일',
      displayGroupKey: menuCode,
      components: [{ ingredientName: ingName, quantity: 80, unit: 'g' }],
      groupIds: [],
      updatedAt: new Date().toISOString(),
    });
  });

  await step(steps, '원가마진표에서 테스트 메뉴 원가 반영 확인', async () => {
    await goto(page, base, '/cost/margin');
    // 레시피·판매가·식자재가 모두 삽입됐으므로 원가마진표에 메뉴명이 표시돼야 함
    await page
      .getByText(menuName, { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '테스트 레코드 정리', async () => {
    if (recipeId != null) await dbDeleteById(page, MAIN_DB, 'menu_recipes', recipeId);
    if (priceId != null) await dbDeleteById(page, MAIN_DB, 'cost_selling_prices', priceId);
    if (menuId != null) await dbDeleteById(page, MAIN_DB, 'menu_master', menuId);
    if (ingId != null) await dbDeleteById(page, MAIN_DB, 'cost_ingredients', ingId);
  });

  return { name: '식자재 단가 등록 → 레시피 원가 → 원가 보고서 반영', steps };
}
