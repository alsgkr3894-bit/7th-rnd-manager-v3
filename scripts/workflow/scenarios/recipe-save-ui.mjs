import {
  dbDeleteById,
  dbInsertOne,
  deleteRecordsByField,
  goto,
  MAIN_DB,
  step,
  waitForMenuAddButton,
} from '../helpers.mjs';

/**
 * 레시피 구성품 UI 저장 시나리오.
 * DB에 메뉴+식자재 삽입 → 메뉴마스터 편집 모달에서 레시피 구성품 검색·추가·저장
 * → 모달 재진입으로 저장 결과 검증 → 정리
 *
 * P0-2: 레시피 UI 저장 흐름 end-to-end
 */
export async function scenarioRecipeSaveUI({ page, base, runId }) {
  const steps = [];
  const menuCode = `ZZ-E2E-S16-${runId}`.toUpperCase();
  const menuName = `E2E레시피UI-${runId}`;
  const ingName = `E2E재료UI-${runId}`;
  let ingId, menuId;

  await step(steps, 'DB에 메뉴·식자재 삽입 후 메뉴마스터 진입', async () => {
    ingId = await dbInsertOne(page, MAIN_DB, 'cost_ingredients', {
      ingredientName: ingName,
      category: '기타',
      productCode: null,
      priceOverride: 800,
      baseQuantity: 100,
      baseUnitType: 'g',
      isManual: true,
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

    await goto(page, base, '/menu-master');
    await waitForMenuAddButton(page);
  });

  await step(steps, '메뉴명 클릭하여 편집 모달 열기', async () => {
    // 메뉴명은 button 요소 — 클릭하면 편집 모달 오픈
    await page.getByRole('button', { name: menuName, exact: false }).first().click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '구성품 추가 버튼 클릭', async () => {
    const dialog = page.getByRole('dialog');
    const addBtn = dialog.getByRole('button', { name: /구성품 추가/ });
    await addBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await addBtn.click();
  });

  await step(steps, '식자재 검색 입력 후 제안 선택', async () => {
    const dialog = page.getByRole('dialog');
    const searchInput = dialog.getByPlaceholder('식자재명 검색 (↑↓ 이동, Enter 선택)').last();
    await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
    // 검색어 입력 (앞 6자 — 충분히 고유함)
    await searchInput.fill(ingName.slice(0, 6));

    // 제안 리스트 표시 대기
    const suggestion = dialog
      .getByRole('listbox')
      .getByRole('option')
      .filter({ hasText: ingName })
      .first();
    await suggestion.waitFor({ state: 'visible', timeout: 10_000 });
    await suggestion.click();

    // 식자재명이 input에 반영됐는지 확인
    await page.waitForFunction(
      name => {
        const inputs = [
          ...document.querySelectorAll(
            '[role="dialog"] input[placeholder="식자재명 검색 (↑↓ 이동, Enter 선택)"]'
          ),
        ];
        return inputs.some(inp => inp.value.includes(name));
      },
      ingName,
      { timeout: 8_000 }
    );
  });

  await step(steps, '수량 입력', async () => {
    const dialog = page.getByRole('dialog');
    const qtyInput = dialog.locator('input[type="number"]').last();
    await qtyInput.waitFor({ state: 'visible', timeout: 5_000 });
    await qtyInput.fill('50');
  });

  await step(steps, '모달 저장', async () => {
    const dialog = page.getByRole('dialog');
    const saveBtn = dialog.getByRole('button', { name: '저장' });
    await saveBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await saveBtn.click();
    await dialog.waitFor({ state: 'detached', timeout: 15_000 });
  });

  await step(steps, '메뉴 재진입 후 레시피 구성품 저장 확인', async () => {
    // 저장 후 목록 갱신 대기
    await waitForMenuAddButton(page);

    await page.getByRole('button', { name: menuName, exact: false }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });

    // 레시피 로딩 완료 대기
    await page.waitForFunction(
      () => !document.querySelector('[role="dialog"]')?.textContent?.includes('레시피 로딩 중'),
      { timeout: 15_000 }
    );

    // 저장된 식자재명이 recipe input value에 있는지 확인
    await page.waitForFunction(
      name => {
        const inputs = [
          ...document.querySelectorAll(
            '[role="dialog"] input[placeholder="식자재명 검색 (↑↓ 이동, Enter 선택)"]'
          ),
        ];
        return inputs.some(inp => inp.value.includes(name));
      },
      ingName,
      { timeout: 10_000 }
    );

    // 모달 닫기
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached', timeout: 10_000 });
  });

  await step(steps, '테스트 레코드 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'menu_recipes', 'menuCode', menuCode);
    if (menuId != null) await dbDeleteById(page, MAIN_DB, 'menu_master', menuId);
    if (ingId != null) await dbDeleteById(page, MAIN_DB, 'cost_ingredients', ingId);
  });

  return { name: '레시피 UI 저장 → 재진입 구성품 확인', steps };
}
