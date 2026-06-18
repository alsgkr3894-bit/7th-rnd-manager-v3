import { routeUrl } from '../qa-browser-utils.mjs';

export const MAIN_DB = 'rnd_manager_v3';
export const NAV_TIMEOUT_MS = Number.parseInt(process.env.QA_NAV_TIMEOUT_MS || '', 10) || 90_000;

/** 스텝 실행 — 성공/실패와 메시지를 기록 (throw 안 함) */
export async function step(steps, label, fn) {
  try {
    await fn();
    steps.push({ label, ok: true });
    return true;
  } catch (err) {
    steps.push({ label, ok: false, error: err?.message || String(err) });
    return false;
  }
}

/** store에서 field === value 인 레코드를 모두 삭제 (best-effort, 테스트 정리용) */
export async function deleteRecordsByField(page, dbName, store, field, value) {
  await page.evaluate(
    ({ dbName, store, field, value }) =>
      new Promise(resolve => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(store)) {
            db.close();
            return resolve();
          }
          const tx = db.transaction(store, 'readwrite');
          const cur = tx.objectStore(store).openCursor();
          cur.onsuccess = e => {
            const c = e.target.result;
            if (c) {
              if (c.value?.[field] === value) c.delete();
              c.continue();
            }
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        };
        req.onerror = () => resolve();
      }),
    { dbName, store, field, value }
  );
}

export async function goto(page, base, path) {
  await page.goto(routeUrl(base, path), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  await page.waitForSelector('main', { timeout: 90_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

  const hydratedFirst = await page
    .waitForFunction(
      () => {
        const el = document.querySelector('button, input, textarea');
        return el ? Object.keys(el).some(k => k.startsWith('__react')) : false;
      },
      undefined,
      { timeout: 60_000 }
    )
    .then(() => true)
    .catch(() => false);

  if (!hydratedFirst) {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS }).catch(() => {});
    await page.waitForSelector('main', { timeout: 90_000 }).catch(() => {});
    await page
      .waitForFunction(
        () => {
          const el = document.querySelector('button, input, textarea');
          return el ? Object.keys(el).some(k => k.startsWith('__react')) : false;
        },
        undefined,
        { timeout: 90_000 }
      )
      .catch(() => {});
  }

  await page
    .waitForFunction(() => window.__idbInitDone === true, undefined, { timeout: 30_000 })
    .catch(() => {});
}

/** useCurrentRole의 fail-closed 초기값('viewer')이 해소될 때까지 '메뉴 추가' 버튼 enabled 대기 */
export async function waitForMenuAddButton(page, timeout = 60_000) {
  const check = async t =>
    page.waitForFunction(
      () => {
        const btn = [...document.querySelectorAll('button')].find(b =>
          (b.textContent || '').trim().includes('메뉴 추가')
        );
        return btn && !btn.disabled;
      },
      undefined,
      { timeout: t }
    );

  try {
    await check(timeout);
  } catch (err) {
    if (err.message?.includes('context') || err.message?.includes('Execution context')) {
      await page.waitForSelector('main', { timeout: 30_000 }).catch(() => {});
      await check(30_000);
      return;
    }
    const diag = await page
      .evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(b =>
          (b.textContent || '').trim().includes('메뉴 추가')
        );
        return {
          found: !!btn,
          disabled: btn ? btn.disabled : null,
          hasReact: btn ? Object.keys(btn).some(k => k.startsWith('__react')) : null,
          url: window.location.href,
          bodyHead: document.body.innerText.slice(0, 150),
        };
      })
      .catch(() => null);
    process.stderr.write(`[waitForMenuAddButton:timeout] ${JSON.stringify(diag)}\n`);
    throw err;
  }
}

export async function installIdbInitInterceptor(page) {
  await page.addInitScript(() => {
    window.__idbInitDone = false;
    const origOpen = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (name, version) {
      const req = origOpen.call(this, name, version);
      if (version !== undefined) {
        req.addEventListener('success', () => {
          window.__idbInitDone = true;
        });
      }
      return req;
    };
  });
}

export function attachWorkflowDiagnostics(page) {
  page.on('pageerror', err => process.stderr.write(`[browser:pageerror] ${err.message}\n`));
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().startsWith('[DB]')) {
      process.stderr.write(`[browser:console:${msg.type()}] ${msg.text()}\n`);
    }
  });
}

/** IDB store에 레코드를 삽입하고 생성된 auto-increment id를 반환 */
export async function dbInsertOne(page, dbName, storeName, record) {
  return page.evaluate(
    ({ dbName, storeName, record }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            return reject(new Error(`${storeName} store 없음`));
          }
          const tx = db.transaction(storeName, 'readwrite');
          let insertedId;
          const addReq = tx.objectStore(storeName).add(record);
          addReq.onsuccess = e => {
            insertedId = e.target.result;
          };
          tx.oncomplete = () => {
            db.close();
            resolve(insertedId);
          };
          tx.onerror = () => {
            db.close();
            reject(new Error('삽입 실패: ' + tx.error));
          };
        };
        req.onerror = () => reject(new Error('DB 열기 실패'));
      }),
    { dbName, storeName, record }
  );
}

/** IDB store에서 numeric key로 레코드를 삭제 (best-effort, 테스트 정리용) */
export async function dbDeleteById(page, dbName, storeName, id) {
  await page.evaluate(
    ({ dbName, storeName, id }) =>
      new Promise(resolve => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            return resolve();
          }
          const tx = db.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).delete(id);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        };
        req.onerror = () => resolve();
      }),
    { dbName, storeName, id }
  );
}
