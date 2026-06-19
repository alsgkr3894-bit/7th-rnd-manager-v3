import { dbDeleteById, dbInsertOne, goto, MAIN_DB, step, waitForMenuAddButton } from '../helpers.mjs';

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

  await step(steps, '메뉴를 클릭하여 편집 모달 열기', async () => {
    await page.getByText(menuName, { exact: false }).first().click();
    // 편집 모달이 열릴 때까지 대기 (저장 버튼 또는 모달 역할)
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '구성품 추가 버튼 클릭', async () => {
    const dialog = page.getByRole('dialog');
    const addBtn = dialog.getByRole('button', { name: '+ 구성품 추가' });
    await addBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await addBtn.click();
  });

  await step(steps, '식자재 검색 입력 후 제안 선택', async () => {
    const dialog = page.getByRole('dialog');
    const searchInput = dialog.getByPlaceholder('식자재명 검색 (↑↓ 이동, Enter 선택)').last();
    await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
    await searchInput.fill(ingName.slice(0, 6));

    // 제안 리스트 표시 대기
    const suggestion = dialog
      .getByRole('listbox')
      .getByRole('option')
      .filter({ hasText: ingName })
      .first();
    await suggestion.waitFor({ state: 'visible', timeout: 10_000 });
    await suggestion.click();
  });

  await step(steps, '수량 입력', async () => {
    const dialog = page.getByRole('dialog');
    // 방금 추가된 행의 수량 입력 (마지막 number input)
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
    await page.getByText(menuName, { exact: false }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });

    // 레시피 섹션에 저장한 식자재명이 표시되는지 확인
    await dialog
      .getByText(ingName, { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 });

    // 모달 닫기
    const closeBtn = dialog.getByRole('button', { name: /닫기|취소|×/ }).first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    else await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached', timeout: 10_000 });
  });

  await step(steps, '테스트 레코드 정리', async () => {
    // menu_recipes는 menuCode 기반으로 정리
    const { deleteRecordsByField } = await import('../helpers.mjs');
    await deleteRecordsByField(page, MAIN_DB, 'menu_recipes', 'menuCode', menuCode);
    if (menuId != null) await dbDeleteById(page, MAIN_DB, 'menu_master', menuId);
    if (ingId != null) await dbDeleteById(page, MAIN_DB, 'cost_ingredients', ingId);
  });

  return { name: '레시피 UI 저장 → 재진입 구성품 확인', steps };
}
