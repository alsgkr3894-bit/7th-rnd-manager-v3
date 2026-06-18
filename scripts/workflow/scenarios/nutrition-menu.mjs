import { dbDeleteById, dbInsertOne, goto, MAIN_DB, step } from '../helpers.mjs';

// 영양성분 메뉴 등록 → 영양 메뉴 목록 반영
export async function scenarioNutritionMenu({ page, base, runId }) {
  const steps = [];
  const menuCode = `ZZ-E2E-S12-${runId}`.toUpperCase();
  const menuName = `E2E영양메뉴-${runId}`;
  let menuRefId;

  await step(steps, '영양성분 메뉴 페이지 진입 및 DB 직접 삽입', async () => {
    await goto(page, base, '/nutrition/menu');
    menuRefId = await dbInsertOne(page, MAIN_DB, 'nutrition_menu_ref', {
      menuCode,
      menuName,
      category: '피자',
      displayOrder: 9999,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  await step(steps, '영양 메뉴 목록 재진입 후 메뉴명 표시 확인', async () => {
    await goto(page, base, '/nutrition/menu');
    await page
      .getByText(menuName, { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '테스트 레코드 정리', async () => {
    if (menuRefId != null) {
      await dbDeleteById(page, MAIN_DB, 'nutrition_menu_ref', menuRefId);
    }
  });

  return { name: '영양성분 메뉴 등록 → 영양 메뉴 목록 반영', steps };
}
