import { writeFileSync } from 'node:fs';
import { chromium, getQaBase, newAuthedContext } from './qa-browser-utils.mjs';
import {
  attachWorkflowDiagnostics,
  dbDeleteById,
  dbInsertOne,
  deleteRecordsByField,
  goto,
  installIdbInitInterceptor,
  MAIN_DB,
  step,
  waitForMenuAddButton,
} from './workflow/helpers.mjs';
import { scenarioPassed } from './workflow-qa-utils.mjs';

const BASE = getQaBase();

function nowIso() {
  return new Date().toISOString();
}

function makeScenario(name) {
  return { name, steps: [] };
}

async function dbFindByField(page, dbName, storeName, field, value) {
  return page.evaluate(
    ({ dbName, storeName, field, value }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            return reject(new Error(`${storeName} store 없음`));
          }
          const out = [];
          const tx = db.transaction(storeName, 'readonly');
          const cur = tx.objectStore(storeName).openCursor();
          cur.onsuccess = e => {
            const cursor = e.target.result;
            if (cursor) {
              if (cursor.value?.[field] === value) out.push(cursor.value);
              cursor.continue();
            }
          };
          tx.oncomplete = () => {
            db.close();
            resolve(out);
          };
          tx.onerror = () => {
            db.close();
            reject(new Error('조회 실패: ' + tx.error));
          };
        };
        req.onerror = () => reject(new Error('DB 열기 실패'));
      }),
    { dbName, storeName, field, value }
  );
}

async function dbFindOneByField(page, dbName, storeName, field, value) {
  const rows = await dbFindByField(page, dbName, storeName, field, value);
  return rows[0] || null;
}

async function closeDialogIfOpen(page) {
  const dialog = page.getByRole('dialog');
  if ((await dialog.count()) > 0) {
    await page.keyboard.press('Escape').catch(() => {});
    await dialog.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }
}

async function scenarioNoteRoundtrip({ page, base, runId }) {
  const scenario = makeScenario('노트 UI 입력 -> 저장 -> 목록/상세 재표시');
  const { steps } = scenario;
  const title = `DEEP노트-${runId}`;
  const content = `DEEP 노트 본문 ${runId}`;
  let noteId = null;

  await step(steps, '노트 작성 화면에 입력값 저장', async () => {
    await goto(page, base, '/note/write');
    await page.locator('input[placeholder*="조합 테스트"]').fill(title);
    await page.locator('textarea[placeholder*="테스트 조건"]').fill(content);
    await page.getByRole('button', { name: '저장하기' }).click();
    await page.waitForFunction(() => window.location.pathname === '/note', undefined, {
      timeout: 30_000,
    });
  });

  await step(steps, '목록에서 방금 저장한 제목 표시', async () => {
    await page.getByText(title, { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, 'IndexedDB에 제목/본문 값 저장 확인', async () => {
    const row = await dbFindOneByField(page, MAIN_DB, 'menu_dev_notes', 'title', title);
    if (!row) throw new Error('menu_dev_notes에 저장된 노트를 찾지 못함');
    if (!String(row.testContent || '').includes(content)) throw new Error('노트 본문 저장값 불일치');
    noteId = row.id;
  });

  await step(steps, '상세 페이지 재진입 후 제목/본문 표시', async () => {
    if (noteId == null) throw new Error('noteId 없음');
    await goto(page, base, `/note/${noteId}`);
    await page.getByText(title, { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 });
    await page.getByText(content, { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '노트 테스트 데이터 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'menu_dev_notes', 'title', title);
  });

  return scenario;
}

async function scenarioCalendarRoundtrip({ page, base, runId }) {
  const scenario = makeScenario('일정 UI 입력 -> 저장 -> 캘린더/DB 재표시');
  const { steps } = scenario;
  const title = `DEEP일정-${runId}`;
  const memo = `DEEP 일정 메모 ${runId}`;
  const today = new Date().toISOString().slice(0, 10);

  await step(steps, '일정 추가 모달에서 제목/메모 저장', async () => {
    await goto(page, base, '/note/calendar');
    await page.getByRole('button', { name: '일정 추가' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });
    await dialog.getByPlaceholder('일정 제목').fill(title);
    await dialog.locator('input[type="date"]').fill(today);
    await dialog.getByPlaceholder('관련 내용, 준비사항 등').fill(memo);
    await dialog.getByRole('button', { name: '추가' }).click();
    await dialog.waitFor({ state: 'detached', timeout: 15_000 });
  });

  await step(steps, '캘린더 화면에 저장한 일정 제목 표시', async () => {
    await page.getByText(title, { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, 'IndexedDB에 일정 제목/메모 저장 확인', async () => {
    const row = await dbFindOneByField(page, MAIN_DB, 'note_schedules', 'title', title);
    if (!row) throw new Error('note_schedules에 저장된 일정을 찾지 못함');
    if (row.date !== today) throw new Error(`일정 날짜 저장값 불일치: ${row.date}`);
    if (!String(row.description || '').includes(memo)) throw new Error('일정 메모 저장값 불일치');
  });

  await step(steps, '일정 테스트 데이터 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'note_schedules', 'title', title);
  });

  return scenario;
}

async function scenarioMenuMasterRoundtrip({ page, base, runId }) {
  const scenario = makeScenario('메뉴마스터 UI 입력 -> 저장 -> 목록/DB 재표시');
  const { steps } = scenario;
  const code = `DEEP-MENU-${runId}`.toUpperCase();
  const name = `DEEP메뉴-${runId}`;

  await step(steps, '메뉴마스터 모달에서 코드/메뉴명 저장', async () => {
    await goto(page, base, '/menu-master');
    await waitForMenuAddButton(page);
    await page.getByRole('button', { name: '메뉴 추가' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('예) P-OR-005-L').fill(code);
    await dialog.getByPlaceholder('예) 슈퍼콤비네이션').fill(name);
    await dialog.getByRole('button', { name: '저장' }).click();
    await dialog.waitFor({ state: 'detached', timeout: 15_000 });
  });

  await step(steps, '목록에 저장한 메뉴명 표시', async () => {
    await page.getByText(name, { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, 'IndexedDB menu_master 값 확인', async () => {
    const row = await dbFindOneByField(page, MAIN_DB, 'menu_master', 'menuCode', code);
    if (!row) throw new Error('menu_master에 저장된 메뉴를 찾지 못함');
    if (row.menuName !== name) throw new Error(`메뉴명 저장값 불일치: ${row.menuName}`);
  });

  await step(steps, '메뉴마스터 테스트 데이터 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'menu_master', 'menuCode', code);
  });

  return scenario;
}

async function scenarioIngredientRoundtrip({ page, base, runId }) {
  const scenario = makeScenario('식자재 UI 입력 -> 저장 -> 목록/DB 재표시');
  const { steps } = scenario;
  const name = `DEEP식자재-${runId}`;

  await step(steps, '식자재 추가 모달에서 재료명 저장', async () => {
    await goto(page, base, '/ingredient/manage');
    await page.waitForFunction(
      () => [...document.querySelectorAll('button')].some(btn => btn.textContent?.includes('식자재 추가') && !btn.disabled),
      undefined,
      { timeout: 60_000 }
    );
    await page.getByRole('button', { name: '식자재 추가' }).click();
    await page.getByPlaceholder('예) 모짜렐라치즈').fill(name);
    await page.locator('button.btn.primary').filter({ hasText: /^추가$/ }).last().click();
  });

  await step(steps, '식자재 목록에 저장한 재료명 표시', async () => {
    await page.getByText(name, { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, 'IndexedDB cost_ingredients 값 확인', async () => {
    const row = await dbFindOneByField(page, MAIN_DB, 'cost_ingredients', 'ingredientName', name);
    if (!row) throw new Error('cost_ingredients에 저장된 식자재를 찾지 못함');
    if (row.isManual !== true) throw new Error('수동 등록 플래그가 true가 아님');
  });

  await step(steps, '식자재 테스트 데이터 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'cost_ingredients', 'ingredientName', name);
  });

  return scenario;
}

async function scenarioRecipeRoundtrip({ page, base, runId }) {
  const scenario = makeScenario('레시피 구성품 UI 저장 -> 재진입/DB 재표시');
  const { steps } = scenario;
  const menuCode = `DEEP-REC-${runId}`.toUpperCase();
  const menuName = `DEEP레시피-${runId}`;
  const ingName = `DEEP레시피재료-${runId}`;
  let menuId = null;
  let ingId = null;

  await step(steps, '레시피용 메뉴/식자재 시드 삽입', async () => {
    ingId = await dbInsertOne(page, MAIN_DB, 'cost_ingredients', {
      ingredientName: ingName,
      category: '기타',
      productCode: null,
      priceOverride: 1200,
      baseQuantity: 100,
      baseUnitType: 'g',
      isManual: true,
      updatedAt: nowIso(),
    });
    menuId = await dbInsertOne(page, MAIN_DB, 'menu_master', {
      menuCode,
      menuName,
      category: '사이드',
      size: '단일',
      status: 'active',
      displayOrder: 9999,
      updatedAt: nowIso(),
    });
  });

  await step(steps, '메뉴 편집 모달에서 구성품 추가/수량 저장', async () => {
    await goto(page, base, '/menu-master');
    await waitForMenuAddButton(page);
    await page.getByRole('button', { name: menuName, exact: false }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });
    await dialog.getByRole('button', { name: '구성품 추가' }).click();
    const searchInput = dialog.getByPlaceholder('식자재명 검색 (↑↓ 이동, Enter 선택)').last();
    await searchInput.fill(ingName.slice(0, 8));
    await dialog.getByRole('listbox').getByRole('option').filter({ hasText: ingName }).first().click();
    await dialog.locator('input[type="number"]').last().fill('55');
    await dialog.getByRole('button', { name: '저장' }).click();
    await dialog.waitFor({ state: 'detached', timeout: 15_000 });
  });

  await step(steps, '메뉴 재진입 후 구성품 이름/수량 표시', async () => {
    await waitForMenuAddButton(page);
    await page.getByRole('button', { name: menuName, exact: false }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForFunction(
      () => !document.querySelector('[role="dialog"]')?.textContent?.includes('레시피 로딩 중'),
      undefined,
      { timeout: 15_000 }
    );
    await page.waitForFunction(
      ({ ingName }) => {
        const inputs = [
          ...document.querySelectorAll(
            '[role="dialog"] input[placeholder="식자재명 검색 (↑↓ 이동, Enter 선택)"]'
          ),
        ];
        return inputs.some(input => input.value.includes(ingName));
      },
      { ingName },
      { timeout: 10_000 }
    );
    const qtyValue = await dialog.locator('input[type="number"]').last().inputValue();
    if (Number(qtyValue) !== 55) throw new Error(`재진입 수량 표시값 불일치: ${qtyValue}`);
    await closeDialogIfOpen(page);
  });

  await step(steps, 'IndexedDB menu_recipes 구성품 저장 확인', async () => {
    const rows = await dbFindByField(page, MAIN_DB, 'menu_recipes', 'menuCode', menuCode);
    if (rows.length === 0) throw new Error('menu_recipes에 저장된 레시피가 없음');
    const serialized = JSON.stringify(rows);
    if (!serialized.includes(ingName)) throw new Error('레시피 저장값에 식자재명이 없음');
    if (!serialized.includes('55')) throw new Error('레시피 저장값에 수량 55가 없음');
  });

  await step(steps, '레시피 테스트 데이터 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'menu_recipes', 'menuCode', menuCode);
    if (menuId != null) await dbDeleteById(page, MAIN_DB, 'menu_master', menuId);
    if (ingId != null) await dbDeleteById(page, MAIN_DB, 'cost_ingredients', ingId);
  });

  return scenario;
}

async function scenarioNutritionRoundtrip({ page, base, runId }) {
  const scenario = makeScenario('영양성분 UI 입력 -> 저장 -> 재진입/DB 재표시');
  const { steps } = scenario;
  const menuCode = `DEEP-NUT-${runId}`.toUpperCase();
  const menuName = `DEEP영양-${runId}`;
  let menuId = null;

  await step(steps, '영양성분용 메뉴마스터 시드 삽입', async () => {
    menuId = await dbInsertOne(page, MAIN_DB, 'menu_master', {
      menuCode,
      menuName,
      category: '사이드',
      size: '단일',
      status: 'active',
      displayOrder: 9998,
      updatedAt: nowIso(),
    });
  });

  await step(steps, '영양성분 메뉴 목록에 메뉴 추가', async () => {
    await goto(page, base, '/nutrition/menu');
    await page.locator('.card').first().locator('button.btn.sm.ghost').nth(1).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });
    await dialog.getByPlaceholder('코드·메뉴명·중분류로 검색…').fill(menuCode);
    await page.getByText(menuName, { exact: false }).last().click();
    await dialog.getByRole('button', { name: '추가' }).click();
    await dialog.waitFor({ state: 'detached', timeout: 15_000 });
    await page.getByText(menuName, { exact: false }).first().waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '영양 수치 입력 후 저장', async () => {
    await page.getByText(menuName, { exact: false }).first().click();
    await page.waitForFunction(
      () => document.querySelectorAll('.card input[type="number"]').length >= 10,
      undefined,
      { timeout: 15_000 }
    );
    await page.waitForTimeout(250);
    const numberInputs = page.locator('.card input[type="number"]');
    await numberInputs.nth(0).fill('321');
    await numberInputs.nth(1).fill('654');
    await numberInputs.nth(9).fill('987');
    await page.getByRole('button', { name: new RegExp(`${menuName}.*저장`) }).click();
    await page.waitForFunction(
      () => [...document.querySelectorAll('.toast')].some(toast => toast.textContent.includes('저장')),
      undefined,
      { timeout: 10_000 }
    );
  });

  await step(steps, '재진입 후 입력한 영양 수치 표시', async () => {
    await goto(page, base, '/nutrition/menu');
    await page.getByText(menuName, { exact: false }).first().click();
    await page.waitForFunction(
      () => document.querySelectorAll('.card input[type="number"]').length >= 10,
      undefined,
      { timeout: 15_000 }
    );
    await page.waitForTimeout(250);
    const values = await page.locator('.card input[type="number"]').evaluateAll(inputs =>
      inputs.map(input => input.value)
    );
    if (values[0] !== '321') throw new Error(`중량 재표시값 불일치: ${values[0]}`);
    if (values[1] !== '654') throw new Error(`열량 재표시값 불일치: ${values[1]}`);
    if (values[9] !== '987') throw new Error(`나트륨 재표시값 불일치: ${values[9]}`);
  });

  await step(steps, 'IndexedDB nutrition_raw_values/menu_ref 값 확인', async () => {
    const refs = await dbFindByField(page, MAIN_DB, 'nutrition_menu_ref', 'menuCode', menuCode);
    const rawRows = await dbFindByField(page, MAIN_DB, 'nutrition_raw_values', 'menuCode', menuCode);
    if (refs.length !== 1) throw new Error(`nutrition_menu_ref 저장 건수 불일치: ${refs.length}`);
    if (rawRows.length !== 1) throw new Error(`nutrition_raw_values 저장 건수 불일치: ${rawRows.length}`);
    const row = rawRows[0];
    if (Number(row.weight) !== 321 || Number(row.kcal) !== 654 || Number(row.sodium) !== 987) {
      throw new Error(`영양 DB 저장값 불일치: ${JSON.stringify(row)}`);
    }
  });

  await step(steps, '영양성분 테스트 데이터 정리', async () => {
    await deleteRecordsByField(page, MAIN_DB, 'nutrition_raw_values', 'menuCode', menuCode);
    await deleteRecordsByField(page, MAIN_DB, 'nutrition_menu_ref', 'menuCode', menuCode);
    if (menuId != null) await dbDeleteById(page, MAIN_DB, 'menu_master', menuId);
  });

  return scenario;
}

function summarize(scenarios, browserIssues) {
  return {
    generatedAt: new Date().toISOString(),
    base: BASE,
    counts: {
      total: scenarios.length,
      passed: scenarios.filter(scenario => scenarioPassed(scenario.steps)).length,
      failed: scenarios.filter(scenario => !scenarioPassed(scenario.steps)).length,
    },
    scenarios,
    browserIssues,
  };
}

const browser = await chromium.launch();
const context = await newAuthedContext(browser, { viewport: { width: 1280, height: 900 } }, BASE);
const page = await context.newPage();
const runId = String(Date.now());
const browserIssues = { pageErrors: [], consoleErrors: [], httpErrors: [] };

attachWorkflowDiagnostics(page);
page.on('pageerror', err => browserIssues.pageErrors.push(err.message));
page.on('console', msg => {
  if (msg.type() === 'error') browserIssues.consoleErrors.push(msg.text());
});
page.on('response', response => {
  const status = response.status();
  if (status >= 500) browserIssues.httpErrors.push(`${status} ${response.url()}`);
});
await installIdbInitInterceptor(page);

const scenarios = [];
try {
  const ctx = { page, base: BASE, runId };
  for (const scenarioFn of [
    scenarioNoteRoundtrip,
    scenarioCalendarRoundtrip,
    scenarioMenuMasterRoundtrip,
    scenarioIngredientRoundtrip,
    scenarioRecipeRoundtrip,
    scenarioNutritionRoundtrip,
  ]) {
    scenarios.push(await scenarioFn(ctx));
  }
} finally {
  await context.close();
  await browser.close();
}

const report = summarize(scenarios, browserIssues);
const outPath = process.env.DEEP_FUNCTIONAL_AUDIT_OUT || 'docs/deep-functional-audit-results-2026-07-02.json';
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('\nDeep functional audit\n');
for (const scenario of scenarios) {
  const ok = scenarioPassed(scenario.steps);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${scenario.name}`);
  for (const item of scenario.steps) {
    console.log(`  ${item.ok ? '✓' : '✗'} ${item.label}${item.ok ? '' : ` — ${item.error}`}`);
  }
}
console.log(`\n${report.counts.passed}/${report.counts.total} scenarios passed`);
console.log(`browser page errors: ${browserIssues.pageErrors.length}`);
console.log(`browser console errors: ${browserIssues.consoleErrors.length}`);
console.log(`browser http 500+: ${browserIssues.httpErrors.length}`);
console.log(`result file: ${outPath}`);

if (report.counts.failed > 0 || browserIssues.pageErrors.length > 0 || browserIssues.httpErrors.length > 0) {
  process.exitCode = 1;
}
