import { chromium } from 'playwright';
const B = process.env.BASE || 'http://localhost:3003';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();

// 1. initDB 트리거 (스토어 생성)
await p.goto(`${B}/ingredient`, { waitUntil: 'networkidle', timeout: 15000 });
await p.waitForTimeout(1500);

// 2. cost_ingredients에 수동 레코드 3건 주입
const inserted = await p.evaluate(async () => {
  const open = () => new Promise((res, rej) => {
    const r = indexedDB.open('rnd_manager_v3');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const db = await open();
  if (!db.objectStoreNames.contains('cost_ingredients')) return 'no-store';
  const tx = db.transaction('cost_ingredients', 'readwrite');
  const s = tx.objectStore('cost_ingredients');
  const now = new Date().toISOString();
  const recs = [
    { ingredientName: '테스트치즈', category: '치즈', baseQuantity: 1000, baseUnitType: 'g', isManual: true, discontinued: false, excluded: false, updatedAt: now },
    { ingredientName: '테스트도우', category: '도우',  baseQuantity: 500,  baseUnitType: 'g', isManual: true, discontinued: false, excluded: false, updatedAt: now },
    { ingredientName: '미분류재료', category: '',      baseQuantity: null, baseUnitType: 'g', isManual: true, discontinued: false, excluded: false, updatedAt: now },
  ];
  for (const r of recs) s.add(r);
  await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  return 'ok';
});
console.log('inject:', inserted);

// 3. 리로드 후 stat 카드 확인
await p.goto(`${B}/ingredient`, { waitUntil: 'networkidle', timeout: 15000 });
await p.waitForTimeout(1800);

const bodyText = await p.locator('main').innerText();
const hasTotal = bodyText.includes('전체 식자재');
const hasUncat = bodyText.includes('미분류');
const emptyGone = !bodyText.includes('등록된 식자재가 없어요');
console.log('has전체식자재:', hasTotal, '| has미분류:', hasUncat, '| emptyGone:', emptyGone);
console.log('main snippet:', bodyText.replace(/\s+/g, ' ').slice(0, 200));

const ok = hasTotal && hasUncat && emptyGone;
console.log(ok ? '\n✅ 데이터 경로 정상 (stat 카드 렌더)' : '\n❌ 데이터 경로 실패');

// cleanup: delete DB
await p.evaluate(() => new Promise(res => { const r = indexedDB.deleteDatabase('rnd_manager_v3'); r.onsuccess = res; r.onerror = res; r.onblocked = res; }));
await browser.close();
process.exit(ok ? 0 : 1);
