import { dbDeleteById, dbInsertOne, goto, MAIN_DB, step } from '../helpers.mjs';

// 판매가 등록 → 원가마진표 반영
export async function scenarioCostMargin({ page, base, runId }) {
  const steps = [];
  const menuCode = `ZZ-E2E-S10-${runId}`.toUpperCase();
  const menuName = `E2E마진테스트-${runId}`;
  let priceId;

  await step(steps, '원가마진 페이지 진입 및 DB 직접 삽입', async () => {
    await goto(page, base, '/cost/margin');
    priceId = await dbInsertOne(page, MAIN_DB, 'cost_selling_prices', {
      menuCode,
      menuName,
      category: '사이드',
      size: '단일',
      price: 1500,
      note: '',
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
    if (priceId != null) {
      await dbDeleteById(page, MAIN_DB, 'cost_selling_prices', priceId);
    }
  });

  return { name: '판매가 등록 → 원가마진표 반영', steps };
}
