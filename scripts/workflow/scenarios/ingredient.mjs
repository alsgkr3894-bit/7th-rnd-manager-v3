import { deleteRecordsByField, goto, MAIN_DB, step } from '../helpers.mjs';

// 식자재 등록 → 관리 목록 반영
export async function scenarioIngredientCreate({ page, base, runId }) {
  const steps = [];
  const ingredientName = `E2E식자재-${runId}`;

  await step(steps, '식자재 관리 페이지 진입', async () => {
    await goto(page, base, '/ingredient/manage');
    await page.waitForFunction(
      () => {
        const btn = [...document.querySelectorAll('button')].find(b =>
          (b.textContent || '').trim().includes('식자재 추가')
        );
        return btn && !btn.disabled;
      },
      undefined,
      { timeout: 60_000 }
    );
  });

  await step(steps, '식자재 추가 모달 오픈 및 재료명 입력', async () => {
    await page.getByRole('button', { name: '식자재 추가' }).click();
    await page.getByPlaceholder('예) 모짜렐라치즈').waitFor({ state: 'visible', timeout: 10_000 });
    await page.getByPlaceholder('예) 모짜렐라치즈').fill(ingredientName);
  });

  await step(steps, '추가 클릭 → 모달 닫힘', async () => {
    await page
      .locator('button.btn.primary')
      .filter({ hasText: /^추가$/ })
      .last()
      .click();
    await page.getByPlaceholder('예) 모짜렐라치즈').waitFor({ state: 'detached', timeout: 15_000 });
  });

  await step(steps, '식자재 목록에 재료명 표시 확인', async () => {
    await page
      .getByText(ingredientName, { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '테스트 식자재 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'cost_ingredients', 'ingredientName', ingredientName);
  });

  return { name: '식자재 등록 → 관리 목록 반영', steps };
}
