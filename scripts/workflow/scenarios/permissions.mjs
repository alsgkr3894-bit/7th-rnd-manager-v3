import { goto, step, waitForMenuAddButton } from '../helpers.mjs';

// viewer 권한 → 파괴적 액션 차단 (UI 가드 + 실행함수 레이어)
export async function scenarioViewerBlocking({ page, base }) {
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

  await step(steps, '복원 페이지: 파일 선택과 실행 진입 차단(UI 가드)', async () => {
    await goto(page, base, '/settings/restore');
    await page.waitForSelector('input[type="file"]', { state: 'visible', timeout: 15_000 });
    const fileInputDisabled = await page.locator('input[type="file"]').evaluate(el => el.disabled);
    if (!fileInputDisabled) {
      throw new Error('복원 파일 선택 input이 viewer에서 활성화 — UI 가드 누락');
    }

    const restoreButtons = await page
      .locator('button')
      .evaluateAll(buttons =>
        buttons
          .filter(button => (button.textContent || '').trim() === '복원 실행')
          .map(button => ({ disabled: button.disabled }))
      );
    if (restoreButtons.some(button => !button.disabled)) {
      throw new Error('복원 실행 버튼이 viewer에서 활성화 — UI 가드 누락');
    }
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
