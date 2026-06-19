import { dbDeleteById, dbInsertOne, goto, MAIN_DB, step } from '../helpers.mjs';

/**
 * 레시피 구성품 + 판매가 DB 삽입 → 원가마진표에서 메뉴 확인
 * P0-1: 메뉴 등록 → 레시피 저장 → 원가마진표 반영
 */
export async function scenarioRecipeCostMargin({ page, base, runId }) {
  const steps = [];
  const menuCode = `ZZ-E2E-S13-${runId}`.toUpperCase();
  const menuName = `E2E레시피원가-${runId}`;
  const ingName = `E2E재료-${runId}`;
  let ingId, menuId, priceId, recipeId;

  await step(steps, '원가마진 페이지 진입 및 테스트 데이터 삽입', async () => {
    await goto(page, base, '/cost/margin');

    ingId = await dbInsertOne(page, MAIN_DB, 'cost_ingredients', {
      ingredientName: ingName,
      category: '기타',
      productCode: null,
      priceOverride: 1000,
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
      displayOrder: 9999,
      updatedAt: new Date().toISOString(),
    });

    priceId = await dbInsertOne(page, MAIN_DB, 'cost_selling_prices', {
      menuCode,
      menuName,
      category: '사이드',
      size: '단일',
      price: 2000,
      updatedAt: new Date().toISOString(),
    });

    recipeId = await dbInsertOne(page, MAIN_DB, 'menu_recipes', {
      menuCode,
      menuName,
      category: '사이드',
      kind: 'side',
      size: '단일',
      displayGroupKey: menuCode,
      components: [{ ingredientName: ingName, quantity: 50, unit: 'g' }],
      groupIds: [],
      updatedAt: new Date().toISOString(),
    });
  });

  await step(steps, '원가마진표 재진입 후 메뉴명 표시 확인', async () => {
    await goto(page, base, '/cost/margin');
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

  return { name: '레시피 구성품 + 판매가 → 원가마진표 반영', steps };
}
