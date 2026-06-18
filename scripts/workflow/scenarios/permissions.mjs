import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { goto, step, waitForMenuAddButton } from '../helpers.mjs';

// viewer 권한 → 파괴적 액션 차단 (UI 가드 + 실행함수 레이어)
export async function scenarioViewerBlocking({ page, base, tmpDir }) {
  const steps = [];
  let viewerAccountId = null;

  await step(steps, '페이지 진입 후 viewer 계정 IndexedDB 생성', async () => {
    await goto(page, base, '/menu-master');
    await waitForMenuAddButton(page);
    viewerAccountId = await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open('rnd_manager_v3');
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('ref_accounts')) {
              db.close();
              return reject(new Error('ref_accounts store 없음 — DB 미초기화'));
            }
            const now = new Date().toISOString();
            const tx = db.transaction('ref_accounts', 'readwrite');
            const put = tx.objectStore('ref_accounts').put({
              name: 'E2E뷰어',
              email: 'e2e-v@test',
              role: 'viewer',
              createdAt: now,
              updatedAt: now,
            });
            put.onsuccess = e => {
              const id = e.target.result;
              localStorage.setItem('rnd_active_account_id:main', String(id));
              localStorage.setItem('rnd_active_account_id', String(id));
              window.dispatchEvent(
                new CustomEvent('rnd:account-changed', { detail: { brandId: 'main' } })
              );
              db.close();
              resolve(id);
            };
            tx.onerror = () => {
              db.close();
              reject(new Error('viewer account 삽입 실패'));
            };
          };
          req.onerror = () => reject(new Error('DB open 실패'));
        })
    );
    if (viewerAccountId == null) throw new Error('viewer account ID 없음');
  });

  await step(steps, 'viewer 역할 반영 확인 (재진입)', async () => {
    await goto(page, base, '/menu-master');
    await page.waitForFunction(
      () => document.querySelectorAll('button[disabled]').length > 0,
      undefined,
      { timeout: 15_000 }
    );
  });

  await step(steps, '메뉴마스터: "메뉴 추가" 버튼 비활성화(UI 가드)', async () => {
    const btn = page.getByRole('button', { name: /메뉴 추가/ });
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    const disabled = await btn.evaluate(el => el.disabled);
    if (!disabled) throw new Error('"메뉴 추가" 버튼이 viewer에서 활성화 — UI 가드 누락');
  });

  await step(steps, '메뉴마스터: "초기화" 버튼 비활성화(UI 가드)', async () => {
    const btn = page.getByRole('button', { name: /^초기화$/ });
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    const disabled = await btn.evaluate(el => el.disabled);
    if (!disabled) throw new Error('"초기화" 버튼이 viewer에서 활성화 — UI 가드 누락');
  });

  await step(steps, '시스템 설정: "모든 데이터 초기화" 비활성화(UI 가드)', async () => {
    await goto(page, base, '/settings/system');
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('button')].some(b =>
          b.textContent.includes('모든 데이터 초기화')
        ),
      undefined,
      { timeout: 15_000 }
    );
    const btn = page.getByRole('button', { name: /모든 데이터 초기화/ });
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    const disabled = await btn.evaluate(el => el.disabled);
    if (!disabled) throw new Error('"모든 데이터 초기화" 버튼이 viewer에서 활성화 — UI 가드 누락');
  });

  await step(steps, '복원 실행: assertActiveAdmin viewer 거부 토스트 확인', async () => {
    const backupPath = join(tmpDir, 'viewer-guard-test-backup.json');
    writeFileSync(
      backupPath,
      JSON.stringify({
        stores: {
          menu_master: [
            {
              id: 99999901,
              menuCode: 'ZZ-E2E-GUARD',
              menuName: 'E2E가드테스트',
              displayOrder: 99999,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      })
    );

    await goto(page, base, '/settings/restore');
    await page.waitForSelector('input[type="file"]', { state: 'visible', timeout: 15_000 });
    await page.setInputFiles('input[type="file"]', backupPath);
    await page
      .getByRole('heading', { name: '5. 복원 실행' })
      .waitFor({ state: 'visible', timeout: 15_000 });

    await page.waitForFunction(
      () => {
        const b = [...document.querySelectorAll('button')].find(
          el => el.textContent.trim() === '복원 실행'
        );
        return b && !b.disabled;
      },
      undefined,
      { timeout: 10_000 }
    );
    await page.getByRole('button', { name: '복원 실행' }).click();

    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('button')].some(b =>
          b.textContent.includes('모듈 교체 복원')
        ),
      undefined,
      { timeout: 10_000 }
    );
    await page.locator('button').filter({ hasText: '모듈 교체 복원' }).click();

    await page.waitForFunction(
      () => {
        const toasts = document.querySelectorAll('.toast');
        return [...toasts].some(t => t.textContent.includes('권한이 없습니다'));
      },
      undefined,
      { timeout: 10_000 }
    );
  });

  await step(steps, 'viewer 계정 정리 및 활성 계정 초기화', async () => {
    const id = viewerAccountId;
    await page.evaluate(
      id =>
        new Promise(resolve => {
          localStorage.removeItem('rnd_active_account_id:main');
          localStorage.removeItem('rnd_active_account_id');
          window.dispatchEvent(
            new CustomEvent('rnd:account-changed', { detail: { brandId: 'main' } })
          );
          const req = indexedDB.open('rnd_manager_v3');
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('ref_accounts')) {
              db.close();
              return resolve();
            }
            const tx = db.transaction('ref_accounts', 'readwrite');
            tx.objectStore('ref_accounts').delete(id);
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
      id
    );
  });

  return { name: 'viewer 권한 → 파괴적 액션 차단', steps };
}
