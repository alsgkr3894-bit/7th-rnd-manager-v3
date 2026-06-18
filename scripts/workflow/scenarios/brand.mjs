import { deleteRecordsByField, goto, step, waitForMenuAddButton } from '../helpers.mjs';

// 브랜드 전환 → 브랜드별 데이터 분리 확인
export async function scenarioBrandIsolation({ page, base, runId }) {
  const steps = [];
  const code = `ZZ-E2E-S7-${runId}`.toUpperCase();
  const menuName = `E2E브랜드분리-${runId}`;
  const CHINA4_DB = 'rnd_manager_v3__china4';

  await step(steps, 'china4 브랜드로 전환 및 메뉴마스터 페이지 진입', async () => {
    await page.evaluate(() => localStorage.setItem('v3:active-brand', 'china4'));
    await goto(page, base, '/menu-master');
  });

  await step(steps, 'china4 DB에 테스트 메뉴 삽입', async () => {
    await waitForMenuAddButton(page);
    await page.evaluate(
      ({ dbName, record }) =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open(dbName);
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('menu_master')) {
              db.close();
              return reject(new Error('menu_master store 없음 — initDB() 실행 여부 확인'));
            }
            const tx = db.transaction('menu_master', 'readwrite');
            tx.objectStore('menu_master').add(record);
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => {
              db.close();
              reject(new Error('삽입 실패'));
            };
          };
          req.onerror = () => reject(new Error('DB 열기 실패'));
        }),
      {
        dbName: CHINA4_DB,
        record: {
          menuCode: code,
          menuName,
          category: '테스트',
          status: 'active',
          displayOrder: 9999,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    );
    await goto(page, base, '/menu-master');
    await page
      .getByText(menuName, { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, 'main 브랜드 전환 후 china4 메뉴 비표시 확인', async () => {
    await page.evaluate(() => localStorage.setItem('v3:active-brand', 'main'));
    await goto(page, base, '/menu-master');
    const found = await page.evaluate(mn => document.body.innerText.includes(mn), menuName);
    if (found)
      throw new Error(`main 브랜드에서 china4 메뉴(${menuName})가 표시됨 — 브랜드 분리 실패`);
  });

  await step(steps, '테스트 레코드 정리 및 main 브랜드 복원 확인', async () => {
    await deleteRecordsByField(page, CHINA4_DB, 'menu_master', 'menuCode', code);
    const active = await page.evaluate(() => localStorage.getItem('v3:active-brand'));
    if (active !== 'main' && active !== null)
      await page.evaluate(() => localStorage.setItem('v3:active-brand', 'main'));
  });

  return { name: '브랜드 전환 → 브랜드별 데이터 분리 확인', steps };
}
