import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isValidBackupShape } from '../../workflow-qa-utils.mjs';
import { dbDeleteById, dbInsertOne, goto, MAIN_DB, step } from '../helpers.mjs';

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

async function menuCountByCode(page, menuCode) {
  return page.evaluate(
    ({ dbName, menuCode }) =>
      new Promise(resolve => {
        const req = indexedDB.open(dbName);
        req.onerror = () => resolve(0);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('menu_master')) {
            db.close();
            return resolve(0);
          }
          const tx = db.transaction('menu_master', 'readonly');
          const cursorReq = tx.objectStore('menu_master').openCursor();
          let count = 0;
          cursorReq.onsuccess = event => {
            const cursor = event.target.result;
            if (!cursor) return;
            if (cursor.value?.menuCode === menuCode) count += 1;
            cursor.continue();
          };
          tx.oncomplete = () => {
            db.close();
            resolve(count);
          };
          tx.onerror = () => {
            db.close();
            resolve(count);
          };
        };
      }),
    { dbName: MAIN_DB, menuCode }
  );
}

// 백업 생성 → 데이터 삭제 → 복원 실행 → 데이터 복구 확인 (격리 context 내 실제 restore)
export async function scenarioBackupRestoreExecute({ page, base, tmpDir, runId }) {
  const steps = [];
  const menuCode = `QA-RESTORE-${runId}`;
  const menuName = `QA 복원 메뉴 ${runId}`;
  let insertedId = null;
  let backupPath = null;

  await step(steps, '복원 리허설용 메뉴 레코드 삽입', async () => {
    await goto(page, base, '/menu-master');
    insertedId = await dbInsertOne(page, MAIN_DB, 'menu_master', {
      menuCode,
      menuName,
      size: 'L',
      price: 12345,
      category: '피자',
      status: '판매',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const count = await menuCountByCode(page, menuCode);
    if (count !== 1) throw new Error(`메뉴 삽입 확인 실패: ${count}`);
  });

  await step(steps, '테스트 메뉴 포함 백업 파일 다운로드', async () => {
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
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      page.getByRole('button', { name: '백업 파일 다운로드' }).click(),
    ]);
    backupPath = join(tmpDir, 'workflow-restore-execute.json');
    await download.saveAs(backupPath);
    const parsed = JSON.parse(readFileSync(backupPath, 'utf8'));
    if (!isValidBackupShape(parsed)) throw new Error('stores 객체가 없는 백업 파일');
    const backedUp = parsed.stores?.menu_master?.some(row => row?.menuCode === menuCode);
    if (!backedUp) throw new Error('백업 파일에 테스트 메뉴가 없음');
  });

  await step(steps, '복원 전 테스트 메뉴 삭제 확인', async () => {
    await dbDeleteById(page, MAIN_DB, 'menu_master', insertedId);
    const count = await menuCountByCode(page, menuCode);
    if (count !== 0) throw new Error(`삭제 확인 실패: ${count}`);
  });

  await step(steps, '복원 페이지에서 백업 선택 후 자동백업 비활성화', async () => {
    await goto(page, base, '/settings/restore');
    await page.waitForSelector('input[type="file"]', { state: 'visible', timeout: 15_000 });
    await page.setInputFiles('input[type="file"]', backupPath);
    await page.getByRole('heading', { name: '5. 복원 실행' }).waitFor({ state: 'visible' });
    const autoBackupToggle = page.locator('button[aria-pressed="true"]').first();
    if ((await autoBackupToggle.count()) > 0) await autoBackupToggle.click();
  });

  await step(steps, '복원 실행 후 완료 카드 표시', async () => {
    await page.getByRole('button', { name: '복원 실행' }).click();
    await page.getByRole('button', { name: /교체 복원/ }).click();
    await page.getByText('복원 완료', { exact: false }).first().waitFor({
      state: 'visible',
      timeout: 30_000,
    });
  });

  await step(steps, '복원 후 테스트 메뉴 레코드 복구 확인', async () => {
    const count = await menuCountByCode(page, menuCode);
    if (count !== 1) throw new Error(`복원 확인 실패: ${count}`);
  });

  await step(steps, '복원 리허설 테스트 메뉴 정리', async () => {
    const restoredIds = await page.evaluate(
      ({ dbName, menuCode }) =>
        new Promise(resolve => {
          const req = indexedDB.open(dbName);
          req.onerror = () => resolve([]);
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('menu_master')) {
              db.close();
              return resolve([]);
            }
            const ids = [];
            const tx = db.transaction('menu_master', 'readwrite');
            const cursorReq = tx.objectStore('menu_master').openCursor();
            cursorReq.onsuccess = event => {
              const cursor = event.target.result;
              if (!cursor) return;
              if (cursor.value?.menuCode === menuCode) {
                ids.push(cursor.value.id);
                cursor.delete();
              }
              cursor.continue();
            };
            tx.oncomplete = () => {
              db.close();
              resolve(ids);
            };
            tx.onerror = () => {
              db.close();
              resolve(ids);
            };
          };
        }),
      { dbName: MAIN_DB, menuCode }
    );
    if (restoredIds.length === 0) throw new Error('정리할 복원 메뉴가 없음');
  });

  return { name: '백업 → 삭제 → 실제 복원 실행', steps };
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
