import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { goto, step } from '../helpers.mjs';

function csvText(rows) {
  return (
    rows
      .map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n') + '\n'
  );
}

export async function scenarioMenuPriceFailedRowsDownload({ page, base, tmpDir, runId }) {
  const steps = [];
  const fileName = `workflow-menu-price-${runId}.csv`;
  const uploadPath = join(tmpDir, fileName);
  const downloadPath = join(tmpDir, `workflow-menu-price-failed-${runId}.csv`);
  const okMenuName = `QA 판매가 정상 ${runId}`;
  const badMenuName = `QA 판매가 오류 ${runId}`;

  await step(steps, '메뉴판매가 업로드 실패행 fixture 생성', async () => {
    writeFileSync(
      uploadPath,
      csvText([
        ['메뉴코드', '분류', '메뉴명', '규격', '판매가', '비고'],
        [`QA-PRICE-${runId}`, '사이드', okMenuName, '단일', '19900', '정상'],
        [`QA-BAD-${runId}`, '사이드', badMenuName, '단일', '가격오류', '오류'],
      ]),
      'utf8'
    );
  });

  await step(steps, '메뉴마스터 판매가 업로드 카드 진입', async () => {
    await goto(page, base, '/menu-master');
    await page.waitForFunction(
      () => {
        const input = document.querySelector('[data-testid="menu-price-upload-input"]');
        return input && !input.disabled;
      },
      undefined,
      { timeout: 45_000 }
    );
  });

  await step(steps, '정상 1건 + 오류 1건 CSV 업로드 미리보기', async () => {
    await page.setInputFiles('[data-testid="menu-price-upload-input"]', uploadPath);
    await page.getByText(fileName, { exact: false }).waitFor({ state: 'visible', timeout: 20_000 });
    await page.getByText('정상 1건', { exact: false }).waitFor({ state: 'visible' });
    await page.getByText('오류 1건', { exact: false }).waitFor({ state: 'visible' });
    await page.getByText('판매가 인식 실패', { exact: false }).waitFor({ state: 'visible' });
    await page.getByText(badMenuName, { exact: false }).waitFor({ state: 'visible' });
  });

  await step(steps, '오류 행 CSV 다운로드 및 내용 검증', async () => {
    const failedRowsButton = page.locator(
      'xpath=//span[contains(normalize-space(.), "오류 행")]/following-sibling::button[1]'
    );
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      failedRowsButton.click(),
    ]);
    const suggested = download.suggestedFilename();
    if (!/^메뉴판매가_오류행_\d{8}\.csv$/.test(suggested)) {
      throw new Error(`오류행 CSV 파일명 불일치: ${suggested}`);
    }
    await download.saveAs(downloadPath);
    const text = readFileSync(downloadPath, 'utf8').replace(/^\uFEFF/, '');
    for (const expected of ['행번호', '사유', '메뉴명', '판매가 인식 실패', badMenuName]) {
      if (!text.includes(expected)) throw new Error(`오류행 CSV 내용 누락: ${expected}`);
    }
  });

  await step(steps, '메뉴판매가 업로드 미리보기 취소', async () => {
    await page.getByRole('button', { name: '취소' }).click();
    await page.getByText(fileName, { exact: false }).waitFor({ state: 'hidden', timeout: 10_000 });
  });

  return { name: '메뉴판매가 업로드 실패행 CSV 다운로드', steps };
}
