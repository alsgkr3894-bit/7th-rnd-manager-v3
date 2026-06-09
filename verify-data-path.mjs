import { chromium, getQaBase, newAuthedContext, routeUrl } from './scripts/qa-browser-utils.mjs';

const B = getQaBase();
const browser = await chromium.launch({ headless: true });
const ctx = await newAuthedContext(browser, { viewport: { width: 1280, height: 900 } }, B);
const page = await ctx.newPage();

try {
  // 1. initDB 트리거 (스토어 생성)
  await page.goto(routeUrl(B, '/ingredient'), { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);

  // 2. cost_ingredients에 수동 레코드 3건 주입
  const inserted = await page.evaluate(async () => {
    const open = () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('rnd_manager_v3');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const db = await open();
    if (!db.objectStoreNames.contains('cost_ingredients')) return 'no-store';
    const tx = db.transaction('cost_ingredients', 'readwrite');
    const store = tx.objectStore('cost_ingredients');
    const now = new Date().toISOString();
    const records = [
      {
        ingredientName: '테스트치즈',
        category: '치즈',
        baseQuantity: 1000,
        baseUnitType: 'g',
        isManual: true,
        discontinued: false,
        excluded: false,
        updatedAt: now,
      },
      {
        ingredientName: '테스트도우',
        category: '도우',
        baseQuantity: 500,
        baseUnitType: 'g',
        isManual: true,
        discontinued: false,
        excluded: false,
        updatedAt: now,
      },
      {
        ingredientName: '미분류재료',
        category: '',
        baseQuantity: null,
        baseUnitType: 'g',
        isManual: true,
        discontinued: false,
        excluded: false,
        updatedAt: now,
      },
    ];
    for (const record of records) store.add(record);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    return 'ok';
  });
  console.log('inject:', inserted);

  // 3. 리로드 후 stat 카드 확인
  await page.goto(routeUrl(B, '/ingredient'), { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1800);

  const bodyText = await page.locator('main').innerText();
  const hasTotal = bodyText.includes('전체 식자재');
  const hasUncat = bodyText.includes('미분류');
  const emptyGone = !bodyText.includes('등록된 식자재가 없어요');
  console.log('has전체식자재:', hasTotal, '| has미분류:', hasUncat, '| emptyGone:', emptyGone);
  console.log('main snippet:', bodyText.replace(/\s+/g, ' ').slice(0, 200));

  const ok = inserted === 'ok' && hasTotal && hasUncat && emptyGone;
  console.log(ok ? '\n✅ 데이터 경로 정상 (stat 카드 렌더)' : '\n❌ 데이터 경로 실패');
  process.exitCode = ok ? 0 : 1;
} finally {
  await page
    .evaluate(
      () =>
        new Promise(resolve => {
          const request = indexedDB.deleteDatabase('rnd_manager_v3');
          request.onsuccess = resolve;
          request.onerror = resolve;
          request.onblocked = resolve;
        })
    )
    .catch(() => {});
  await ctx.close();
  await browser.close();
}
