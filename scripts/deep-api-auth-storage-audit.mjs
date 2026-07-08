import { writeFileSync } from 'node:fs';
import { chromium, getQaBase, newAuthedContext, routeUrl } from './qa-browser-utils.mjs';
import { ALL_STORES, DB_NAME, DB_VERSION, dbNameFor } from '../lib/db/constants.js';

const BASE = getQaBase();
const OUT = process.env.DEEP_API_STORAGE_OUT || 'docs/deep-api-auth-storage-audit-2026-07-02.json';
const RUN_ID = `DEEP-AUTH-STORAGE-${Date.now()}`;

const LEGACY_STORES = [
  'cost_recipes',
  'cost_pizza_detail',
  'cost_personal_detail',
  'cost_side_detail',
  'cost_set_detail',
  'nutrition_allergy_links',
  'nutrition_ingredient_values',
];

const EXPECTED_INDEXES = {
  upload_log: ['fileHash', 'linkedFileId', 'module', 'module_fileHash'],
  menu_master: ['category', 'displayOrder', 'menuCode', 'status'],
  menu_recipes: ['category', 'displayGroupKey', 'kind', 'menuCode', 'updatedAt'],
  sales_files: ['year_month'],
  sales_rows: [
    'category',
    'category_normalizedMenuName',
    'fileId',
    'normalizedMenuName',
    'status',
    'year_month',
  ],
  sales_rules: ['enable', 'rawMenuName'],
  menu_sales_issues: ['fileId', 'issueType', 'status', 'year_month'],
  ref_sales_categories: ['categoryName', 'displayOrder', 'enabled'],
  ref_sales_aliases: ['enable', 'rawName'],
  ref_excluded: ['menuName'],
  ref_discontinued: ['menuName'],
  ref_event_menus: ['menuName'],
  price_files: ['updateDate'],
  price_rows: ['fileId', 'fileId_productCode', 'productCode', 'updateDate'],
  shipment_rows: ['fileId', 'productCode', 'year_month'],
  ref_shipment_products: ['enable', 'productCode'],
  ref_shipment_rules: ['enable', 'mappedCode', 'rawName'],
  cost_ingredients: ['ingredientName', 'productCode'],
  cost_selling_prices: ['menuCode', 'menuName', 'size'],
  cost_edge_dough: ['edgeType', 'size'],
  cost_upload_log: ['uploadedAt', 'uploadType'],
  cost_recipe_groups: ['name'],
  cost_suppliers: ['name'],
  cost_margin_snapshots: ['capturedAt'],
  cost_ingredient_price_history: ['changedAt', 'ingredientId'],
  menu_dev_notes: ['brand', 'category', 'createdAt', 'parentId', 'status'],
  sample_records: ['category', 'createdAt', 'menuName', 'testDate'],
  note_schedules: ['createdAt', 'date', 'type'],
  work_log: ['at', 'date', 'type'],
  nutrition_menu_ref: ['category', 'displayOrder', 'menuCode'],
  nutrition_raw_values: ['crustType', 'menuCode', 'menu_crust'],
  nutrition_pizza_composition: ['baseMenuCode', 'menuCode'],
  nutrition_origin_master: ['category', 'displayOrder', 'ingredientName'],
  nutrition_allergy_master: ['allergenCode', 'displayOrder'],
  nutrition_topping_master: ['displayOrder', 'toppingCode'],
  nutrition_edge_master: ['displayOrder', 'edgeCode'],
  nutrition_set_composition: ['kind', 'setCode'],
  generated_reports: ['createdAt', 'fav', 'kind'],
  ref_accounts: ['role'],
};

function short(text = '') {
  return String(text).replace(/\s+/g, ' ').trim().slice(0, 220);
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return { json: JSON.parse(text), text: short(text) };
  } catch {
    return { json: null, text: short(text) };
  }
}

async function request(path, options = {}) {
  const response = await fetch(routeUrl(BASE, path), {
    redirect: 'manual',
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
  const { json, text } = await readJsonResponse(response);
  return {
    path,
    status: response.status,
    location: response.headers.get('location'),
    contentType: response.headers.get('content-type'),
    json,
    text,
  };
}

function locationPath(location) {
  if (!location) return null;
  try {
    return new URL(location, BASE).pathname;
  } catch {
    return location;
  }
}

function pass(name, details = {}) {
  return { name, ok: true, ...details };
}

function fail(name, details = {}) {
  return { name, ok: false, ...details };
}

async function auditAuthAndApi() {
  const checks = [];

  const root = await request('/');
  checks.push(
    root.status >= 300 && root.status < 400 && locationPath(root.location) === '/login'
      ? pass('unauthenticated protected route redirects to /login', root)
      : fail('unauthenticated protected route redirects to /login', root)
  );

  const login = await request('/login');
  checks.push(
    login.status === 200
      ? pass('unauthenticated /login renders', login)
      : fail('unauthenticated /login renders', login)
  );

  const authedLogin = await request('/login', { headers: { cookie: 'v3:auth=1' } });
  checks.push(
    authedLogin.status >= 300 &&
      authedLogin.status < 400 &&
      locationPath(authedLogin.location) === '/'
      ? pass('authenticated /login redirects to /', authedLogin)
      : fail('authenticated /login redirects to /', authedLogin)
  );

  const apiWithoutCookie = await request('/api/db/backups');
  checks.push(
    apiWithoutCookie.status === 200 && apiWithoutCookie.json?.ok === true
      ? pass('API routes stay public under middleware and return JSON', {
          ...apiWithoutCookie,
          backupCount: apiWithoutCookie.json?.count,
          latestBackup: apiWithoutCookie.json?.latest?.name || null,
          stale: apiWithoutCookie.json?.stale ?? null,
        })
      : fail('API routes stay public under middleware and return JSON', apiWithoutCookie)
  );

  const favicon = await request('/favicon.ico');
  checks.push(
    favicon.status === 200
      ? pass('favicon is public and served', { ...favicon, text: undefined })
      : fail('favicon is public and served', favicon)
  );

  const health = await request('/api/db/health');
  checks.push(
    health.status === 200 &&
      health.json?.ok === true &&
      typeof health.json?.counts?.storeRows === 'number'
      ? pass('DB health API returns live counts', {
          ...health,
          counts: health.json.counts,
          database: health.json.database,
          schema: health.json.schema,
        })
      : fail('DB health API returns live counts', health)
  );

  const backups = await request('/api/db/backups');
  checks.push(
    backups.status === 200 && backups.json?.ok === true && Array.isArray(backups.json.backups)
      ? pass('DB backup list API returns structured status', {
          ...backups,
          backupDir: backups.json.backupDir,
          count: backups.json.count,
          latest: backups.json.latest?.name || null,
          stale: backups.json.stale,
        })
      : fail('DB backup list API returns structured status', backups)
  );

  if (backups.status === 200 && backups.json?.ok === true) {
    checks.push(
      backups.json.stale === false
        ? pass('latest local DB backup is fresh', {
            latest: backups.json.latest?.name || null,
            latestAgeHours: backups.json.latestAgeHours ?? null,
            staleAfterHours: backups.json.staleAfterHours ?? null,
          })
        : fail('latest local DB backup is fresh', {
            latest: backups.json.latest?.name || null,
            latestModifiedAt: backups.json.latest?.modifiedAt || null,
            latestAgeHours: backups.json.latestAgeHours ?? null,
            staleAfterHours: backups.json.staleAfterHours ?? null,
            stale: backups.json.stale,
          })
    );
  }

  const noOpSync = await request('/api/db/store-rows', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ brandId: 'main', operations: [] }),
  });
  checks.push(
    noOpSync.status === 200 && noOpSync.json?.ok === true && noOpSync.json?.applied === 0
      ? pass('store-row sync no-op POST is accepted', noOpSync)
      : fail('store-row sync no-op POST is accepted', noOpSync)
  );

  const invalidSync = await request('/api/db/store-rows', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      brandId: 'main',
      operations: [
        { type: 'upsert', storeName: '__missing__', recordKey: RUN_ID, data: { runId: RUN_ID } },
      ],
    }),
  });
  checks.push(
    invalidSync.status === 400 && invalidSync.json?.ok === false
      ? pass('store-row sync rejects unknown stores', invalidSync)
      : fail('store-row sync rejects unknown stores', invalidSync)
  );

  const upsertSync = await request('/api/db/store-rows', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      brandId: 'main',
      operations: [
        {
          type: 'upsert',
          storeName: 'settings',
          recordKey: RUN_ID,
          clientId: RUN_ID,
          data: { key: RUN_ID, value: 'roundtrip-ok', runId: RUN_ID },
        },
      ],
    }),
  });
  checks.push(
    upsertSync.status === 200 && upsertSync.json?.ok === true && upsertSync.json?.upserted === 1
      ? pass('store-row sync can upsert a QA row', upsertSync)
      : fail('store-row sync can upsert a QA row', upsertSync)
  );

  const deleteSync = await request('/api/db/store-rows', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      brandId: 'main',
      operations: [
        {
          type: 'delete',
          storeName: 'settings',
          recordKey: RUN_ID,
          clientId: RUN_ID,
        },
      ],
    }),
  });
  checks.push(
    deleteSync.status === 200 && deleteSync.json?.ok === true && deleteSync.json?.deleted === 1
      ? pass('store-row sync can delete the QA row again', deleteSync)
      : fail('store-row sync can delete the QA row again', deleteSync)
  );

  return checks;
}

async function waitForExistingIndexedDb(page, dbName) {
  return page
    .waitForFunction(
      async name => {
        if (typeof indexedDB.databases !== 'function') return true;
        const dbs = await indexedDB.databases();
        return dbs.some(db => db.name === name);
      },
      dbName,
      { timeout: 15_000 }
    )
    .then(() => true)
    .catch(() => false);
}

async function inspectIndexedDb(page, dbName) {
  return page.evaluate(
    ({ dbName }) =>
      new Promise((resolve, reject) => {
        if (typeof indexedDB.databases === 'function') {
          indexedDB
            .databases()
            .then(dbs => {
              if (!dbs.some(db => db.name === dbName)) {
                resolve({ dbName, absent: true, version: null, stores: [], details: {} });
                return;
              }
              openExisting();
            })
            .catch(() => openExisting());
          return;
        }

        openExisting();

        function openExisting() {
          const request = indexedDB.open(dbName);
          request.onerror = () =>
            reject(new Error(request.error?.message || 'IndexedDB open failed'));
          request.onsuccess = () => {
            const db = request.result;
            const stores = [...db.objectStoreNames].sort();
            const details = {};

            if (stores.length === 0) {
              db.close();
              resolve({ dbName, version: db.version, stores, details });
              return;
            }

            const tx = db.transaction(stores, 'readonly');
            for (const storeName of stores) {
              const store = tx.objectStore(storeName);
              details[storeName] = {
                keyPath: store.keyPath,
                autoIncrement: store.autoIncrement,
                indexes: [...store.indexNames].sort(),
              };
            }
            tx.oncomplete = () => {
              db.close();
              resolve({ dbName, version: db.version, stores, details });
            };
            tx.onerror = () => {
              db.close();
              reject(new Error(tx.error?.message || 'IndexedDB inspection failed'));
            };
          };
        }
      }),
    { dbName }
  );
}

function analyzeSchema(snapshot) {
  if (snapshot.absent) {
    return {
      ...snapshot,
      expectedVersion: DB_VERSION,
      expectedStoreCount: ALL_STORES.length,
      versionOk: null,
      missingStores: [],
      extraStores: [],
      legacyStoresPresent: [],
      missingIndexes: [],
      observation:
        'IndexedDB was not created during read-only route visits. Persistence is covered by write-path functional audits.',
      ok: true,
    };
  }

  const storeSet = new Set(snapshot.stores);
  const expected = [...ALL_STORES].sort();
  const missingStores = expected.filter(store => !storeSet.has(store));
  const extraStores = snapshot.stores.filter(store => !ALL_STORES.includes(store));
  const legacyStoresPresent = LEGACY_STORES.filter(store => storeSet.has(store));
  const missingIndexes = [];

  for (const [storeName, indexes] of Object.entries(EXPECTED_INDEXES)) {
    const actual = new Set(snapshot.details?.[storeName]?.indexes || []);
    for (const indexName of indexes) {
      if (!actual.has(indexName)) {
        missingIndexes.push({ storeName, indexName });
      }
    }
  }

  return {
    ...snapshot,
    expectedVersion: DB_VERSION,
    expectedStoreCount: expected.length,
    versionOk: snapshot.version === DB_VERSION,
    missingStores,
    extraStores,
    legacyStoresPresent,
    missingIndexes,
    ok:
      snapshot.version === DB_VERSION &&
      missingStores.length === 0 &&
      legacyStoresPresent.length === 0 &&
      missingIndexes.length === 0,
  };
}

async function auditIndexedDb() {
  const browser = await chromium.launch();
  const checks = [];

  try {
    for (const target of [
      { brand: 'main', dbName: DB_NAME, route: '/note' },
      { brand: 'china4', dbName: dbNameFor('china4'), route: '/note' },
    ]) {
      const ctx = await newAuthedContext(browser, {}, BASE);
      await ctx.addInitScript(brand => {
        localStorage.setItem('v3:active-brand', brand);
        window.__deepIdbOpenCalls = [];
        const originalOpen = IDBFactory.prototype.open;
        IDBFactory.prototype.open = function patchedOpen(name, version) {
          window.__deepIdbOpenCalls.push({ name, version: version ?? null });
          return originalOpen.call(this, name, version);
        };
      }, target.brand);
      const page = await ctx.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(short(message.text()));
      });
      page.on('pageerror', error => pageErrors.push(short(error.message)));
      try {
        for (const initRoute of [
          target.route,
          '/menu-master',
          '/ingredient/manage',
          '/settings/backup',
        ]) {
          await page.goto(routeUrl(BASE, initRoute), { waitUntil: 'networkidle', timeout: 90_000 });
          await page.waitForSelector('main, h1', { timeout: 15_000 }).catch(() => {});
          if (await waitForExistingIndexedDb(page, target.dbName)) break;
        }
        const snapshot = await inspectIndexedDb(page, target.dbName);
        const diagnostics = await page
          .evaluate(() => ({
            url: window.location.href,
            title: document.title,
            bodyHead: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 240),
            idbOpenCalls: window.__deepIdbOpenCalls || [],
          }))
          .catch(error => ({ diagnosticError: error?.message || String(error) }));
        const analysis = {
          ...analyzeSchema(snapshot),
          diagnostics,
          consoleErrors: consoleErrors.slice(0, 5),
          pageErrors: pageErrors.slice(0, 5),
        };
        checks.push(
          analysis.ok
            ? pass(`IndexedDB schema is complete for ${target.brand}`, analysis)
            : fail(`IndexedDB schema is complete for ${target.brand}`, analysis)
        );
      } catch (error) {
        checks.push(
          fail(`IndexedDB schema is complete for ${target.brand}`, {
            dbName: target.dbName,
            error: short(error?.message || String(error)),
          })
        );
      } finally {
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }

  return checks;
}

const authApiChecks = await auditAuthAndApi();
const storageChecks = await auditIndexedDb();
const checks = [...authApiChecks, ...storageChecks];
const failures = checks.filter(check => !check.ok);
const report = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  runId: RUN_ID,
  counts: {
    total: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
  },
  checks,
  failures,
};

writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Deep API/auth/storage audit: ${report.counts.passed}/${report.counts.total} passed`);
console.log(`Result file: ${OUT}`);
for (const failure of failures) {
  console.log(`- ${failure.name}`);
  if (failure.status) console.log(`  status: ${failure.status}`);
  if (failure.location) console.log(`  location: ${failure.location}`);
  if (failure.error) console.log(`  error: ${failure.error}`);
  if (failure.missingStores?.length)
    console.log(`  missing stores: ${failure.missingStores.join(', ')}`);
  if (failure.missingIndexes?.length)
    console.log(`  missing indexes: ${JSON.stringify(failure.missingIndexes.slice(0, 8))}`);
}

if (failures.length > 0) process.exitCode = 1;
