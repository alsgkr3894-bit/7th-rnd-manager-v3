import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dbInsertOne, goto, MAIN_DB, step } from '../helpers.mjs';

function csvText(rows) {
  return rows.map(row => row.join(',')).join('\n') + '\n';
}

async function cleanupShipmentUpload(page, { fileName, productCode }) {
  await page.evaluate(
    ({ dbName, fileName, productCode }) =>
      new Promise(resolve => {
        const openReq = indexedDB.open(dbName);
        openReq.onerror = () => resolve();
        openReq.onsuccess = () => {
          const db = openReq.result;
          const fileIds = [];

          const close = () => {
            db.close();
            resolve();
          };

          const has = store => db.objectStoreNames.contains(store);
          const collectFileIds = done => {
            if (!has('shipment_files')) return done();

            const tx = db.transaction(['shipment_files'], 'readwrite');
            const cursorReq = tx.objectStore('shipment_files').openCursor();
            cursorReq.onsuccess = event => {
              const cursor = event.target.result;
              if (!cursor) return;
              if (cursor.value?.fileName === fileName) {
                fileIds.push(cursor.value.id);
                cursor.delete();
              }
              cursor.continue();
            };
            tx.oncomplete = done;
            tx.onerror = done;
            tx.onabort = done;
          };

          const deleteLinkedRows = () => {
            const stores = ['shipment_rows', 'upload_log', 'ref_shipment_products'].filter(has);
            if (!stores.length) return close();

            const tx = db.transaction(stores, 'readwrite');

            if (has('upload_log')) {
              const cursorReq = tx.objectStore('upload_log').openCursor();
              cursorReq.onsuccess = event => {
                const cursor = event.target.result;
                if (!cursor) return;
                if (cursor.value?.module === 'shipment' && cursor.value?.fileName === fileName) {
                  cursor.delete();
                }
                cursor.continue();
              };
            }

            if (has('ref_shipment_products')) {
              const cursorReq = tx.objectStore('ref_shipment_products').openCursor();
              cursorReq.onsuccess = event => {
                const cursor = event.target.result;
                if (!cursor) return;
                if (cursor.value?.productCode === productCode) {
                  cursor.delete();
                }
                cursor.continue();
              };
            }

            if (has('shipment_rows')) {
              const cursorReq = tx.objectStore('shipment_rows').openCursor();
              cursorReq.onsuccess = event => {
                const cursor = event.target.result;
                if (!cursor) return;
                if (fileIds.includes(cursor.value?.fileId)) {
                  cursor.delete();
                }
                cursor.continue();
              };
            }

            tx.oncomplete = close;
            tx.onerror = close;
            tx.onabort = close;
          };

          collectFileIds(deleteLinkedRows);
        };
      }),
    { dbName: MAIN_DB, fileName, productCode }
  );
}

export async function scenarioShipmentCsvUpload({ page, base, tmpDir, runId }) {
  const steps = [];
  const productCode = `QA-SHIP-${runId}`;
  const productName = `QA 출고 테스트 ${runId}`;
  const fileName = `workflow-shipment-${runId}.csv`;
  const validPath = join(tmpDir, fileName);
  const invalidPath = join(tmpDir, `workflow-shipment-invalid-${runId}.csv`);
  const period = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  };

  await step(steps, '출고량 업로드용 임시 CSV fixture 생성', async () => {
    writeFileSync(
      validPath,
      csvText([
        ['제품코드', '제품명', '판매단위', '배송수량', '합계'],
        [productCode, productName, 'BOX', '3', '30000'],
        [`NO-${runId}`, '대상외 품목', 'EA', '2', '4000'],
      ]),
      'utf8'
    );
    writeFileSync(
      invalidPath,
      csvText([
        ['제품코드', '제품명', '배송수량', '합계'],
        [productCode, productName, 'abc', '30000'],
      ]),
      'utf8'
    );
  });

  await step(steps, '관리 대상 제품 임시 등록', async () => {
    await goto(page, base, '/jette/shipment');
    await cleanupShipmentUpload(page, { fileName, productCode });
    await dbInsertOne(page, MAIN_DB, 'ref_shipment_products', {
      productCode,
      productName,
      normalizedProductName: productName,
      enable: true,
      productType: 'exclusive',
      isManaged: true,
      createdAt: new Date().toISOString(),
    });
  });

  await step(steps, '잘못된 출고량 CSV 업로드 → 오류 토스트', async () => {
    await goto(page, base, '/jette/shipment');
    await page.locator('input[type="number"]').fill(String(period.year));
    await page.locator('select').selectOption(String(period.month));
    await page.setInputFiles('input[type="file"]', invalidPath);
    await page.waitForFunction(
      () => [...document.querySelectorAll('.toast')].some(t => t.textContent.includes('저장할 행')),
      undefined,
      { timeout: 15_000 }
    );
  });

  await step(steps, '정상 출고량 CSV 업로드 → 대상 행 저장', async () => {
    await page.setInputFiles('input[type="file"]', validPath);
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('.toast')].some(t => t.textContent.includes('대상 1건 저장')),
      undefined,
      { timeout: 20_000 }
    );
  });

  await step(steps, '업로드 이력과 원본/대상 건수 표시 확인', async () => {
    await page.getByText(fileName, { exact: false }).first().waitFor({ state: 'visible' });
    await page.getByText('대상 1건', { exact: false }).first().waitFor({ state: 'visible' });
    await page.getByText('(원본 2건)', { exact: false }).first().waitFor({ state: 'visible' });
  });

  await step(steps, '임시 출고량 업로드 데이터 정리', async () => {
    await cleanupShipmentUpload(page, { fileName, productCode });
  });

  return { name: '출고량 CSV 실제 업로드 → 오류/저장 UX', steps };
}
