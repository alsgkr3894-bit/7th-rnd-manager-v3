import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dbDeleteById, dbInsertOne, goto, MAIN_DB, step } from '../helpers.mjs';

// 판매량 파일 삽입 → 업로드 이력 반영
export async function scenarioSalesUpload({ page, base, runId }) {
  const steps = [];
  const fileName = `E2E판매량-${runId}.xlsx`;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  let fileId;

  await step(steps, '판매량 업로드 페이지 진입 및 DB 직접 삽입', async () => {
    await goto(page, base, '/menu-sales/upload');
    fileId = await dbInsertOne(page, MAIN_DB, 'sales_files', {
      fileName,
      year,
      month,
      uploadedAt: new Date().toISOString(),
      totalRows: 0,
    });
  });

  await step(steps, '업로드 이력에 파일명 표시 확인', async () => {
    await goto(page, base, '/menu-sales/upload');
    await page
      .getByText(fileName, { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '테스트 레코드 정리', async () => {
    if (fileId != null) {
      await dbDeleteById(page, MAIN_DB, 'sales_files', fileId);
    }
  });

  return { name: '판매량 파일 삽입 → 업로드 이력 반영', steps };
}

export async function scenarioSalesUploadInvalidExtension({ page, base, tmpDir, runId }) {
  const steps = [];
  const invalidPath = join(tmpDir, `workflow-sales-invalid-${runId}.txt`);

  await step(steps, '판매량 업로드 잘못된 확장자 fixture 생성', async () => {
    writeFileSync(invalidPath, '메뉴명,판매량(개)\n테스트,1\n', 'utf8');
  });

  await step(steps, '판매량 업로드 페이지 진입 및 파일 입력 가능 대기', async () => {
    await goto(page, base, '/menu-sales/upload');
    await page.waitForFunction(
      () => {
        const input = document.querySelector('input[type="file"]');
        return input && !input.disabled;
      },
      undefined,
      { timeout: 30_000 }
    );
  });

  await step(steps, '잘못된 확장자 판매량 파일 선택 → 오류 토스트', async () => {
    await page.setInputFiles('input[type="file"]', invalidPath);
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('.toast')].some(t =>
          t.textContent.includes('지원하지 않는 파일 형식입니다')
        ),
      undefined,
      { timeout: 15_000 }
    );
  });

  return { name: '판매량 업로드 잘못된 확장자 UX', steps };
}
