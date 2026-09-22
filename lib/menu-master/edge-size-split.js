/**
 * lib/menu-master/edge-size-split.js — 치즈크러스트·골드스윗 메뉴마스터 행을 L/R로 분리
 *
 * 2026-09-22 정책: 두 엣지의 추가 요금이 사이즈별로 달라졌다(L 5,000 / R 4,000). 원가는
 * 이미 cost_edge_dough에서 사이즈별로 잡히므로 판매가만 한 행이던 것을 피자와 같은
 * `{코드}-L` / `{코드}-R` 두 행으로 나눈다. 석쇠·씬바사삭은 추가 요금이 없어 그대로 둔다.
 *
 * 메뉴마스터 페이지 로드 때 다른 정규화(normalize.js)와 같이 돌며 멱등이다 — 이미 L/R 행이
 * 있는 패밀리는 건너뛴다. 옛 단일 코드의 판매가 행(cost_selling_prices)은 지우고, 새 L/R
 * 판매가 행은 pushMasterToPrices()로 다시 만든다.
 */
import { getAll, hasStore, runTransaction } from '@/lib/db';
import { resolveMenuEdgeFamily } from './edge-family';
import { pushMasterToPrices } from './index';

export const EDGE_SIZE_PRICES = {
  치즈크러스트: { L: 5000, R: 4000 },
  골드스윗: { L: 5000, R: 4000 },
};

const SIZED_RE = /-(L|R)$/i;

function isSized(row) {
  return row?.size === 'L' || row?.size === 'R' || SIZED_RE.test(String(row?.menuCode || ''));
}

export function planEdgeSizeSplit(menuRows) {
  const rows = Array.isArray(menuRows) ? menuRows : [];
  const byFamily = new Map();
  for (const row of rows) {
    const family = resolveMenuEdgeFamily(row);
    if (!family || !EDGE_SIZE_PRICES[family.key]) continue;
    if (!byFamily.has(family.key)) byFamily.set(family.key, []);
    byFamily.get(family.key).push(row);
  }

  const updates = [];
  const inserts = [];
  const removedCodes = [];
  for (const [key, familyRows] of byFamily) {
    if (familyRows.some(isSized)) continue;
    const source = familyRows.find(row => row.id != null && row.menuCode);
    if (!source) continue;
    const prices = EDGE_SIZE_PRICES[key];
    const baseName = String(source.menuName || '').trim();
    const now = new Date().toISOString();
    const common = { ...source, edgeKey: source.edgeKey || key, updatedAt: now };
    updates.push({
      ...common,
      menuCode: `${source.menuCode}-L`,
      menuName: `${baseName} L`,
      size: 'L',
      price: prices.L,
    });
    const { id: _ignored, ...withoutId } = common;
    inserts.push({
      ...withoutId,
      menuCode: `${source.menuCode}-R`,
      menuName: `${baseName} R`,
      size: 'R',
      price: prices.R,
      displayOrder: (Number(source.displayOrder) || 0) + 1,
    });
    removedCodes.push(source.menuCode);
  }
  return { updates, inserts, removedCodes };
}

/** @returns {Promise<{ changed: number, removedCodes: string[] }>} */
export async function splitEdgeMenuSizes() {
  if (!hasStore('menu_master')) return { changed: 0, removedCodes: [] };
  const plan = planEdgeSizeSplit(await getAll('menu_master'));
  if (plan.updates.length === 0) return { changed: 0, removedCodes: [] };

  const stores = ['menu_master'];
  const staleCodes = new Set(plan.removedCodes);
  let stalePriceRows = [];
  if (hasStore('cost_selling_prices')) {
    stores.push('cost_selling_prices');
    stalePriceRows = (await getAll('cost_selling_prices')).filter(
      row => row.id != null && staleCodes.has(String(row.menuCode || '').trim())
    );
  }

  await runTransaction(stores, 'readwrite', tx => {
    const master = tx.objectStore('menu_master');
    for (const row of plan.updates) master.put(row);
    for (const row of plan.inserts) master.add(row);
    if (stalePriceRows.length > 0) {
      const prices = tx.objectStore('cost_selling_prices');
      for (const row of stalePriceRows) prices.delete(row.id);
    }
  });

  await pushMasterToPrices({ skipAdminGuard: true });
  return { changed: plan.updates.length + plan.inserts.length, removedCodes: plan.removedCodes };
}
