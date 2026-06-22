import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  dbDeleteById,
  dbInsertOne,
  deleteRecordsByField,
  goto,
  MAIN_DB,
  step,
  waitForMenuAddButton,
} from '../helpers.mjs';

// 메뉴 마스터 등록 → 목록 반영 → 정리 (모달 CRUD + 크로스페이지)
export async function scenarioMenuMasterCreate({ page, base, runId }) {
  const steps = [];
  const code = `ZZ-E2E-${runId}`.toUpperCase();
  const name = `E2E자동메뉴-${runId}`;

  await step(steps, '메뉴 마스터 진입 + 메뉴 추가 모달 열기', async () => {
    await goto(page, base, '/menu-master');
    await waitForMenuAddButton(page);
    await page.getByRole('button', { name: '메뉴 추가' }).click();
    await page.getByPlaceholder('예) P-OR-005-L').waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '메뉴코드·메뉴명 입력', async () => {
    await page.getByPlaceholder('예) P-OR-005-L').fill(code);
    await page.getByPlaceholder('예) 슈퍼콤비네이션').fill(name);
  });

  await step(steps, '저장(모달 닫힘)', async () => {
    await page.getByRole('dialog').getByRole('button', { name: '저장' }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15_000 });
  });

  await step(steps, '등록한 메뉴가 목록에 표시', async () => {
    await page
      .getByText(name, { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '테스트 메뉴 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'menu_master', 'menuCode', code);
  });

  return { name: '메뉴 마스터 등록 → 목록 반영', steps };
}

// 메뉴 필수항목 미입력 저장 차단 + 중복 코드 갱신 경고
export async function scenarioMenuFormValidation({ page, base, runId }) {
  const steps = [];
  const code = `ZZ-E2E-S6-${runId}`.toUpperCase();
  const name = `E2E폼검증-${runId}`;

  await step(steps, '빈 폼에서 "저장" 버튼 비활성화', async () => {
    await goto(page, base, '/menu-master');
    await waitForMenuAddButton(page);
    await page.getByRole('button', { name: '메뉴 추가' }).click();
    await page.getByPlaceholder('예) P-OR-005-L').waitFor({ state: 'visible', timeout: 15_000 });

    const saveBtn = page.getByRole('dialog').getByRole('button', { name: '저장' });
    await saveBtn.waitFor({ state: 'visible', timeout: 5_000 });
    const disabled = await saveBtn.evaluate(el => el.disabled);
    if (!disabled) throw new Error('빈 폼에서 저장 버튼이 활성화됨 — 필수 항목 가드 누락');
  });

  await step(steps, '코드만 입력 시 "저장" 버튼 비활성화 유지', async () => {
    await page.getByPlaceholder('예) P-OR-005-L').fill(code);
    const saveBtn = page.getByRole('dialog').getByRole('button', { name: '저장' });
    const disabled = await saveBtn.evaluate(el => el.disabled);
    if (!disabled) throw new Error('메뉴명 없이 저장 버튼 활성화됨');
  });

  await step(steps, '코드+메뉴명 입력 후 저장 완료', async () => {
    await page.getByPlaceholder('예) 슈퍼콤비네이션').fill(name);
    await page.getByRole('dialog').getByRole('button', { name: '저장' }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15_000 });
    await page
      .getByText(name, { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '중복 코드 추가 시 갱신 경고 토스트', async () => {
    await page.getByRole('button', { name: '메뉴 추가' }).click();
    await page.getByPlaceholder('예) P-OR-005-L').waitFor({ state: 'visible', timeout: 15_000 });
    await page.getByPlaceholder('예) P-OR-005-L').fill(code);
    await page.getByPlaceholder('예) 슈퍼콤비네이션').fill(`${name}-복사`);
    await page.getByRole('dialog').getByRole('button', { name: '저장' }).click();

    await page.waitForFunction(
      () => [...document.querySelectorAll('.toast')].some(t => t.textContent.includes('갱신됨')),
      undefined,
      { timeout: 10_000 }
    );
  });

  await step(steps, '테스트 메뉴 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'menu_master', 'menuCode', code);
  });

  return { name: '메뉴 폼 유효성 → 저장 차단 + 중복 코드 경고', steps };
}

// 메뉴마스터 실제 CSV 다운로드 → 파일명/헤더/행/수식 인젝션 방어 확인
export async function scenarioMenuMasterCsvDownload({ page, base, tmpDir, runId }) {
  const steps = [];
  const code = `ZZ-E2E-CSV-${runId}`.toUpperCase();
  const formulaLikeName = `=QA-CSV-${runId}`;
  let menuId;
  let downloadPath;

  await step(steps, 'CSV 다운로드용 메뉴 레코드 삽입', async () => {
    await goto(page, base, '/menu-master');
    await deleteRecordsByField(page, MAIN_DB, 'menu_master', 'menuCode', code);
    menuId = await dbInsertOne(page, MAIN_DB, 'menu_master', {
      menuCode: code,
      menuName: formulaLikeName,
      category: '사이드',
      size: '단일',
      price: 1234,
      status: 'active',
      displayOrder: 9997,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  await step(steps, '메뉴마스터 CSV 다운로드 캡처', async () => {
    await goto(page, base, '/menu-master');
    await page.getByText(formulaLikeName, { exact: false }).first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      page.getByRole('button', { name: /엑셀로 내보내기/ }).click(),
    ]);
    const suggested = download.suggestedFilename();
    if (!/메뉴마스터_\d{8}\.csv$/.test(suggested)) {
      throw new Error(`메뉴마스터 CSV 파일명 불일치: ${suggested}`);
    }
    downloadPath = join(tmpDir, `workflow-menu-master-${runId}.csv`);
    await download.saveAs(downloadPath);
  });

  await step(steps, '메뉴마스터 CSV 내용 검증', async () => {
    const text = readFileSync(downloadPath, 'utf8').replace(/^\uFEFF/, '');
    for (const expected of ['메뉴코드', '메뉴명', '규격', '판매가', '상태', '카테고리', code]) {
      if (!text.includes(expected)) throw new Error(`메뉴마스터 CSV 내용 누락: ${expected}`);
    }
    if (!text.includes(`'${formulaLikeName}`)) {
      throw new Error('메뉴명 수식 인젝션 방어 접두어 누락');
    }
  });

  await step(steps, 'CSV 다운로드 테스트 메뉴 정리', async () => {
    if (menuId != null) await dbDeleteById(page, MAIN_DB, 'menu_master', menuId);
    await deleteRecordsByField(page, MAIN_DB, 'menu_master', 'menuCode', code);
  });

  return { name: '메뉴마스터 CSV 다운로드 파일 검증', steps };
}
