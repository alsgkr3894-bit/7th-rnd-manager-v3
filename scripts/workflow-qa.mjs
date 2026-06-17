/**
 * scripts/workflow-qa.mjs — 핵심 업무 흐름 E2E QA (P1)
 *
 * dev 서버가 떠 있는 상태에서 실행: npm run qa:workflow
 *
 * smoke/runtime QA(읽기 전용 라우트 순회)와 역할이 다르다 — 실제 사용자의 긴 업무 흐름을
 * 브라우저에서 멀티스텝으로 구동하고 단계별로 검증한다. 실패 시 어느 스텝에서 깨졌는지 출력한다.
 *
 * 시나리오는 가능한 한 부작용이 없도록(미리보기/생성-후-정리) 설계한다.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, getQaBase, newAuthedContext, routeUrl } from './qa-browser-utils.mjs';
import {
  scenarioPassed,
  summarizeScenarios,
  firstFailedStep,
  isValidBackupShape,
  formatStepLine,
} from './workflow-qa-utils.mjs';

const BASE = getQaBase();
const NAV_TIMEOUT_MS = Number.parseInt(process.env.QA_NAV_TIMEOUT_MS || '', 10) || 90_000;

/** 스텝 실행 — 성공/실패와 메시지를 기록 (throw 안 함) */
async function step(steps, label, fn) {
  try {
    await fn();
    steps.push({ label, ok: true });
    return true;
  } catch (err) {
    steps.push({ label, ok: false, error: err?.message || String(err) });
    return false;
  }
}

// 메인 브랜드 DB (하위호환 고정 이름). 시나리오가 만든 테스트 레코드 정리에 사용.
const MAIN_DB = 'rnd_manager_v3';

/** store에서 field === value 인 레코드를 모두 삭제 (best-effort, 테스트 정리용) */
async function deleteRecordsByField(page, dbName, store, field, value) {
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

async function goto(page, path) {
  await page.goto(routeUrl(BASE, path), { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  await page.waitForSelector('main', { timeout: 15000 });
  // React 하이드레이션(onChange 등 핸들러 부착) + DB 초기화가 끝나길 기다린다.
  // 이게 없으면 직후의 입력/클릭이 핸들러 부착 전에 실행돼 누락될 수 있다.
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page
    .waitForFunction(() => !(document.body.innerText || '').includes('DB 초기화 중'), {
      timeout: 10000,
    })
    .catch(() => {});
}

// ── 시나리오 1: 백업 생성 → 복원 미리보기 (크로스페이지 파이프라인, 부작용 없음) ──
async function scenarioBackupRestorePreview(page, tmpDir) {
  const steps = [];
  let downloadPath = null;

  await step(steps, '백업 페이지 진입 + 다운로드 버튼 활성화', async () => {
    await goto(page, '/settings/backup');
    await page.getByRole('button', { name: '백업 파일 다운로드' }).waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForFunction(
      () => {
        const btns = [...document.querySelectorAll('button')];
        const b = btns.find(x => (x.textContent || '').includes('백업 파일 다운로드'));
        return b && !b.disabled;
      },
      { timeout: 15000 }
    );
  });

  await step(steps, '백업 파일 다운로드 캡처', async () => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
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
    await goto(page, '/settings/restore');
    await page.waitForSelector('input[type="file"]', { state: 'visible', timeout: 15000 });
    await page.setInputFiles('input[type="file"]', downloadPath);
  });

  await step(steps, '복원 미리보기 렌더(복원 실행 단계 표시)', async () => {
    // 파일 파싱 성공 시 RestorePreview + RestoreExecutePanel(헤딩 "5. 복원 실행")이 렌더된다.
    // 예상 변경 사항 패널은 데이터가 있을 때만 보이므로, 데이터 무관하게 항상 뜨는 실행 단계를 검증.
    await page.getByRole('heading', { name: '5. 복원 실행' }).waitFor({ state: 'visible', timeout: 15000 });
  });

  return { name: '백업 → 복원 미리보기', steps };
}

// ── 시나리오 2: 노트 작성 → 목록 반영 → 정리 (생성 흐름 + 크로스페이지) ──
async function scenarioNoteCreate(page, runId) {
  const steps = [];
  const title = `E2E자동노트-${runId}`;
  const TITLE_PH = '예) 횡성한우 와사비마요 조합 테스트';
  const CONTENT_PH = '테스트 조건, 온도·시간·재료 비율, 핵심 변경사항 등을 기록하세요.';

  await step(steps, '노트 작성 페이지 진입', async () => {
    await goto(page, '/note/write');
    await page.getByPlaceholder(TITLE_PH).waitFor({ state: 'visible', timeout: 15000 });
  });

  await step(steps, '필수 항목(제목·내용) 입력', async () => {
    await page.getByPlaceholder(TITLE_PH).fill(title);
    await page.getByPlaceholder(CONTENT_PH).fill('E2E 워크플로우 자동 검증용 노트');
  });

  await step(steps, '저장 → 목록으로 이동', async () => {
    await Promise.all([
      page.waitForURL(/\/note(\?|$)/, { timeout: 15000 }),
      page.getByRole('button', { name: '저장하기' }).click(),
    ]);
  });

  await step(steps, '작성한 노트가 목록에 표시', async () => {
    await page.getByText(title, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  });

  // 정리: 생성한 노트 삭제 (best-effort — 실패해도 시나리오 실패로 보지 않음)
  await step(steps, '테스트 노트 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'menu_dev_notes', 'title', title);
  });

  return { name: '노트 작성 → 목록 반영', steps };
}

// ── 시나리오 3: 메뉴 마스터 등록 → 목록 반영 → 정리 (모달 CRUD + 크로스페이지) ──
async function scenarioMenuMasterCreate(page, runId) {
  const steps = [];
  const code = `ZZ-E2E-${runId}`.toUpperCase();
  const name = `E2E자동메뉴-${runId}`;

  await step(steps, '메뉴 마스터 진입 + 메뉴 추가 모달 열기', async () => {
    await goto(page, '/menu-master');
    await page.getByRole('button', { name: '메뉴 추가' }).click();
    await page.getByPlaceholder('예) P-OR-005-L').waitFor({ state: 'visible', timeout: 15000 });
  });

  await step(steps, '메뉴코드·메뉴명 입력', async () => {
    await page.getByPlaceholder('예) P-OR-005-L').fill(code);
    await page.getByPlaceholder('예) 슈퍼콤비네이션').fill(name);
  });

  await step(steps, '저장(모달 닫힘)', async () => {
    await page.getByRole('dialog').getByRole('button', { name: '저장' }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 });
  });

  await step(steps, '등록한 메뉴가 목록에 표시', async () => {
    await page.getByText(name, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  });

  await step(steps, '테스트 메뉴 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'menu_master', 'menuCode', code);
  });

  return { name: '메뉴 마스터 등록 → 목록 반영', steps };
}

// ── 시나리오 4: viewer 권한 → 파괴적 액션 차단 (UI 가드 + 실행함수 레이어) ──
async function scenarioViewerBlocking(page, tmpDir) {
  const steps = [];
  let viewerAccountId = null;

  // DB가 초기화된 상태에서 viewer 계정 삽입
  await step(steps, '페이지 진입 후 viewer 계정 IndexedDB 생성', async () => {
    await goto(page, '/menu-master');
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

  // 역할이 반영될 때까지 재진입
  await step(steps, 'viewer 역할 반영 확인 (재진입)', async () => {
    await goto(page, '/menu-master');
    await page.waitForFunction(
      () => document.querySelectorAll('button[disabled]').length > 0,
      { timeout: 15000 }
    );
  });

  // UI 가드: 메뉴마스터 "메뉴 추가" 비활성화
  await step(steps, '메뉴마스터: "메뉴 추가" 버튼 비활성화(UI 가드)', async () => {
    const btn = page.getByRole('button', { name: /메뉴 추가/ });
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    const disabled = await btn.evaluate(el => el.disabled);
    if (!disabled) throw new Error('"메뉴 추가" 버튼이 viewer에서 활성화 — UI 가드 누락');
  });

  // UI 가드: 메뉴마스터 "초기화" 비활성화
  await step(steps, '메뉴마스터: "초기화" 버튼 비활성화(UI 가드)', async () => {
    const btn = page.getByRole('button', { name: /^초기화$/ });
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    const disabled = await btn.evaluate(el => el.disabled);
    if (!disabled) throw new Error('"초기화" 버튼이 viewer에서 활성화 — UI 가드 누락');
  });

  // UI 가드: 시스템 설정 "모든 데이터 초기화" 비활성화
  await step(steps, '시스템 설정: "모든 데이터 초기화" 비활성화(UI 가드)', async () => {
    await goto(page, '/settings/system');
    await page.waitForFunction(
      () => [...document.querySelectorAll('button')].some(b => b.textContent.includes('모든 데이터 초기화')),
      { timeout: 15000 }
    );
    const btn = page.getByRole('button', { name: /모든 데이터 초기화/ });
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    const disabled = await btn.evaluate(el => el.disabled);
    if (!disabled) throw new Error('"모든 데이터 초기화" 버튼이 viewer에서 활성화 — UI 가드 누락');
  });

  // 실행함수 레이어: 복원 페이지는 UI viewer 가드 없음 → importAllToBrand의 assertActiveAdmin이 차단
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

    await goto(page, '/settings/restore');
    await page.waitForSelector('input[type="file"]', { state: 'visible', timeout: 15000 });
    await page.setInputFiles('input[type="file"]', backupPath);
    await page.getByRole('heading', { name: '5. 복원 실행' }).waitFor({ state: 'visible', timeout: 15000 });

    // 1단계 "복원 실행" 버튼이 활성화될 때까지 대기 (selectedRestoreStoreCount > 0)
    await page.waitForFunction(
      () => {
        const b = [...document.querySelectorAll('button')].find(
          el => el.textContent.trim() === '복원 실행'
        );
        return b && !b.disabled;
      },
      { timeout: 10000 }
    );
    await page.getByRole('button', { name: '복원 실행' }).click();

    // 2단계 확인 버튼("N개 모듈 교체 복원") 등장 후 클릭 → assertActiveAdmin 거부
    await page.waitForFunction(
      () => [...document.querySelectorAll('button')].some(b => b.textContent.includes('모듈 교체 복원')),
      { timeout: 10000 }
    );
    await page.locator('button').filter({ hasText: '모듈 교체 복원' }).click();

    // 토스트에 "권한이 없습니다" 메시지 확인
    await page.waitForFunction(
      () => {
        const toasts = document.querySelectorAll('.toast');
        return [...toasts].some(t => t.textContent.includes('권한이 없습니다'));
      },
      { timeout: 10000 }
    );
  });

  // 정리: viewer 계정 삭제 + 활성 계정 초기화
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

// ── 시나리오 5: 잘못된 백업 파일 업로드 → 오류 안내 ──
async function scenarioInvalidBackup(page, tmpDir) {
  const steps = [];

  // 케이스 1: 완전히 깨진 JSON (파싱 실패)
  await step(steps, '손상된 JSON 파일 업로드 → 파싱 오류 토스트', async () => {
    const badPath = join(tmpDir, 'bad-json.json');
    writeFileSync(badPath, 'THIS IS NOT JSON {{{{');

    await goto(page, '/settings/restore');
    await page.waitForSelector('input[type="file"]', { state: 'visible', timeout: 15000 });
    await page.setInputFiles('input[type="file"]', badPath);

    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('.toast')].some(t =>
          t.textContent.includes('백업 파일을 읽을 수 없습니다')
        ),
      { timeout: 10000 }
    );
  });

  // 케이스 2: 유효한 JSON이지만 stores 필드 누락
  await step(steps, 'stores 누락 JSON 업로드 → 구조 오류 토스트', async () => {
    const noStorePath = join(tmpDir, 'no-stores.json');
    writeFileSync(noStorePath, JSON.stringify({ version: 'v3', brand: null }));

    await goto(page, '/settings/restore');
    await page.waitForSelector('input[type="file"]', { state: 'visible', timeout: 15000 });
    await page.setInputFiles('input[type="file"]', noStorePath);

    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('.toast')].some(t =>
          t.textContent.includes('잘못된 백업 파일 형식')
        ),
      { timeout: 10000 }
    );
  });

  return { name: '잘못된 백업 파일 → 오류 안내', steps };
}

// ── 시나리오 6: 메뉴 필수항목 미입력 저장 차단 + 중복 코드 갱신 경고 ──
async function scenarioMenuFormValidation(page, runId) {
  const steps = [];
  const code = `ZZ-E2E-S6-${runId}`.toUpperCase();
  const name = `E2E폼검증-${runId}`;

  // 1단계: 저장 버튼이 빈 폼에서 비활성화
  await step(steps, '빈 폼에서 "저장" 버튼 비활성화', async () => {
    await goto(page, '/menu-master');
    await page.getByRole('button', { name: '메뉴 추가' }).click();
    await page.getByPlaceholder('예) P-OR-005-L').waitFor({ state: 'visible', timeout: 15000 });

    const saveBtn = page.getByRole('dialog').getByRole('button', { name: '저장' });
    await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
    const disabled = await saveBtn.evaluate(el => el.disabled);
    if (!disabled) throw new Error('빈 폼에서 저장 버튼이 활성화됨 — 필수 항목 가드 누락');
  });

  // 2단계: 코드만 입력해도 비활성화 유지 (메뉴명 필수)
  await step(steps, '코드만 입력 시 "저장" 버튼 비활성화 유지', async () => {
    await page.getByPlaceholder('예) P-OR-005-L').fill(code);
    const saveBtn = page.getByRole('dialog').getByRole('button', { name: '저장' });
    const disabled = await saveBtn.evaluate(el => el.disabled);
    if (!disabled) throw new Error('메뉴명 없이 저장 버튼 활성화됨');
  });

  // 3단계: 메뉴명까지 입력 → 저장 성공
  await step(steps, '코드+메뉴명 입력 후 저장 완료', async () => {
    await page.getByPlaceholder('예) 슈퍼콤비네이션').fill(name);
    await page.getByRole('dialog').getByRole('button', { name: '저장' }).click();
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 });
    await page.getByText(name, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 });
  });

  // 4단계: 동일 코드로 다시 추가 시도 → "기존 항목 갱신됨" 경고
  await step(steps, '중복 코드 추가 시 갱신 경고 토스트', async () => {
    await page.getByRole('button', { name: '메뉴 추가' }).click();
    await page.getByPlaceholder('예) P-OR-005-L').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('예) P-OR-005-L').fill(code);
    await page.getByPlaceholder('예) 슈퍼콤비네이션').fill(`${name}-복사`);
    await page.getByRole('dialog').getByRole('button', { name: '저장' }).click();

    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('.toast')].some(t => t.textContent.includes('갱신됨')),
      { timeout: 10000 }
    );
  });

  // 정리
  await step(steps, '테스트 메뉴 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'menu_master', 'menuCode', code);
  });

  return { name: '메뉴 폼 유효성 → 저장 차단 + 중복 코드 경고', steps };
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await newAuthedContext(browser, { acceptDownloads: true }, BASE);
  const page = await ctx.newPage();
  const tmpDir = mkdtempSync(join(tmpdir(), 'wf-qa-'));

  const runId = String(Date.now());
  const scenarios = [];
  try {
    scenarios.push(await scenarioBackupRestorePreview(page, tmpDir));
    scenarios.push(await scenarioNoteCreate(page, runId));
    scenarios.push(await scenarioMenuMasterCreate(page, runId));
    scenarios.push(await scenarioViewerBlocking(page, tmpDir));
    scenarios.push(await scenarioInvalidBackup(page, tmpDir));
    scenarios.push(await scenarioMenuFormValidation(page, runId));
  } finally {
    await page.close();
    await ctx.close();
    await browser.close();
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n  업무 흐름 E2E QA\n');
  for (const sc of scenarios) {
    const ok = scenarioPassed(sc.steps);
    console.log(`  ${ok ? '✅PASS' : '❌FAIL'}  ${sc.name}`);
    for (const s of sc.steps) console.log(formatStepLine(s));
    if (!ok) {
      const failed = firstFailedStep(sc.steps);
      if (failed) console.log(`    └ 최초 실패: "${failed.label}" — ${failed.error}`);
    }
  }
  const { passed, total } = summarizeScenarios(scenarios);
  console.log(`\n  ${passed}/${total} 시나리오 통과\n`);
  process.exit(passed === total ? 0 : 1);
}

main().catch(e => {
  console.error('workflow-qa 실행 실패:', e);
  process.exit(2);
});
