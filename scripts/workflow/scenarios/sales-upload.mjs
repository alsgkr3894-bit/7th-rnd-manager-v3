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
