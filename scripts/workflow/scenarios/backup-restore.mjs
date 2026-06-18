import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isValidBackupShape } from '../../workflow-qa-utils.mjs';
import { goto, step } from '../helpers.mjs';

// 백업 생성 → 복원 미리보기 (크로스페이지 파이프라인, 부작용 없음)
export async function scenarioBackupRestorePreview({ page, base, tmpDir }) {
  const steps = [];
  let downloadPath = null;

  await step(steps, '백업 페이지 진입 + 다운로드 버튼 활성화', async () => {
    await goto(page, base, '/settings/backup');
    await page.waitForFunction(
      () => {
        const btns = [...document.querySelectorAll('button')];
        const b = btns.find(x => (x.textContent || '').includes('백업 파일 다운로드'));
        return b && !b.disabled;
      },
      undefined,
      { timeout: 45_000 }
    );
  });

  await step(steps, '백업 파일 다운로드 캡처', async () => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      page.getByRole('button', { name: '백업 파일 다운로드' }).click(),
    ]);
    downloadPath = join(tmpDir, 'workflow-backup.json');
    await download.saveAs(downloadPath);
  });

  await step(steps, '다운로드 파일이 유효한 v3 백업 형태', async () => {
    const parsed = JSON.parse(readFileSync(downloadPath, 'utf8'));
    if (!isValidBackupShape(parsed)) throw new Error('stores 객체가 없는 백업 파일');
  });

  await step(steps, '복원 페이지에서 백업 파일 선택', async () => {
    await goto(page, base, '/settings/restore');
    await page.waitForSelector('input[type="file"]', { state: 'visible', timeout: 15_000 });
    await page.setInputFiles('input[type="file"]', downloadPath);
  });

  await step(steps, '복원 미리보기 렌더(복원 실행 단계 표시)', async () => {
    await page
      .getByRole('heading', { name: '5. 복원 실행' })
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  return { name: '백업 → 복원 미리보기', steps };
}

// 잘못된 백업 파일 업로드 → 오류 안내
export async function scenarioInvalidBackup({ page, base, tmpDir }) {
  const steps = [];

  await step(steps, '손상된 JSON 파일 업로드 → 파싱 오류 토스트', async () => {
    const badPath = join(tmpDir, 'bad-json.json');
    writeFileSync(badPath, 'THIS IS NOT JSON {{{{');

    await goto(page, base, '/settings/restore');
    await page.waitForSelector('input[type="file"]', { state: 'visible', timeout: 15_000 });
    await page.setInputFiles('input[type="file"]', badPath);

    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('.toast')].some(t =>
          t.textContent.includes('백업 파일을 읽을 수 없습니다')
        ),
      undefined,
      { timeout: 10_000 }
    );
  });

  await step(steps, 'stores 누락 JSON 업로드 → 구조 오류 토스트', async () => {
    const noStorePath = join(tmpDir, 'no-stores.json');
    writeFileSync(noStorePath, JSON.stringify({ version: 'v3', brand: null }));

    await goto(page, base, '/settings/restore');
    await page.waitForSelector('input[type="file"]', { state: 'visible', timeout: 15_000 });
    await page.setInputFiles('input[type="file"]', noStorePath);

    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('.toast')].some(t =>
          t.textContent.includes('잘못된 백업 파일 형식')
        ),
      undefined,
      { timeout: 10_000 }
    );
  });

  return { name: '잘못된 백업 파일 → 오류 안내', steps };
}
