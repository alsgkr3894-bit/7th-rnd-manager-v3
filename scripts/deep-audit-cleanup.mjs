import { chromium, getQaBase, newAuthedContext, routeUrl } from './qa-browser-utils.mjs';
import { MAIN_DB } from './workflow/helpers.mjs';

const BASE = getQaBase();
const BASES = [...new Set([BASE, 'http://localhost:3000', 'http://127.0.0.1:3000'])];

const TARGETS = [
  { store: 'menu_dev_notes', fields: ['title', 'menuName', 'menuCode'] },
  { store: 'note_schedules', fields: ['title'] },
  { store: 'menu_master', fields: ['menuCode', 'menuName'] },
  { store: 'cost_ingredients', fields: ['ingredientName'] },
  { store: 'menu_recipes', fields: ['menuCode', 'menuName'] },
  { store: 'nutrition_menu_ref', fields: ['menuCode', 'menuName'] },
  { store: 'nutrition_raw_values', fields: ['menuCode', 'menuName'] },
];

const browser = await chromium.launch();

try {
  const finalSummary = {};
  for (const base of BASES) {
    const context = await newAuthedContext(browser, {}, base);
    const page = await context.newPage();
    try {
      await page.goto(routeUrl(base, '/'), { waitUntil: 'domcontentloaded', timeout: 90_000 });
      await page.waitForSelector('main', { timeout: 90_000 });
      finalSummary[base] = await page.evaluate(
        ({ dbName, targets }) =>
          new Promise((resolve, reject) => {
            const req = indexedDB.open(dbName);
            req.onsuccess = () => {
              const db = req.result;
              const existing = targets.filter(target => db.objectStoreNames.contains(target.store));
              const counts = {};
              if (existing.length === 0) {
                db.close();
                return resolve(counts);
              }
              const tx = db.transaction(
                existing.map(target => target.store),
                'readwrite'
              );
              for (const target of existing) {
                counts[target.store] = 0;
                const cursorReq = tx.objectStore(target.store).openCursor();
                cursorReq.onsuccess = event => {
                  const cursor = event.target.result;
                  if (!cursor) return;
                  const record = cursor.value || {};
                  const match = target.fields.some(field => {
                    const value = String(record?.[field] ?? '');
                    return value.startsWith('DEEP') || value.includes('DEEP');
                  });
                  if (match) {
                    cursor.delete();
                    counts[target.store] += 1;
                  }
                  cursor.continue();
                };
              }
              tx.oncomplete = () => {
                db.close();
                resolve(counts);
              };
              tx.onerror = () => {
                db.close();
                reject(new Error('cleanup tx failed: ' + tx.error));
              };
            };
            req.onerror = () => reject(new Error('DB open failed'));
          }),
        { dbName: MAIN_DB, targets: TARGETS }
      );
    } finally {
      await context.close();
    }
  }
  console.log(JSON.stringify(finalSummary, null, 2));
} finally {
  await browser.close();
}
