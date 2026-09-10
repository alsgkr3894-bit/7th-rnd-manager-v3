/**
 * lib/menu-master/recipe-versions.js — 레시피 저장 시점 스냅샷 이력 (menu_recipe_versions).
 *
 * 레시피를 저장할 때마다 그 시점의 구성품·공통원가묶음·원가·원가율을 스냅샷으로
 * 하나씩 쌓는다(append-only, 삭제 없음). 최신 스냅샷이 곧 현재 저장된 레시피와
 * 같은 내용이므로, "현재 vs 과거 특정 시점"을 비교하는 용도로 쓴다.
 *
 * lib/menu-recipes/store.js(canonical 레시피)와 별개 store다 — 저 store는
 * "지금" 하나만 갖고, 여기는 "지금까지" 전부를 쌓는다.
 */
import { getAll, runTransaction, hasStore } from '@/lib/db';
import { getActiveBrandId } from '@/lib/active-brand';

export const RECIPE_VERSIONS_STORE = 'menu_recipe_versions';

// 오래 방치된 메뉴가 무한정 쌓이지 않도록 메뉴당 보관 개수를 제한한다.
const MAX_VERSIONS_PER_MENU = 100;

function text(value) {
  return String(value ?? '').trim();
}

function safeComponents(components) {
  return (Array.isArray(components) ? components : []).map(c => ({
    ingredientName: text(c?.ingredientName),
    productCode: text(c?.productCode) || null,
    quantity: Number.isFinite(Number(c?.quantity)) ? Number(c?.quantity) : null,
    unit: text(c?.unit) || null,
    unitPrice: Number.isFinite(Number(c?.unitPrice)) ? Number(c?.unitPrice) : null,
  }));
}

/**
 * 레시피 저장 직후 호출 — 그 시점 상태를 스냅샷으로 한 행 추가한다.
 * 실패해도 레시피 저장 자체를 막으면 안 되므로 호출부에서 실패를 삼킨다(부수 기록).
 */
export async function saveRecipeVersionSnapshot(snapshot) {
  if (!hasStore(RECIPE_VERSIONS_STORE)) return null;
  const menuCode = text(snapshot?.menuCode);
  if (!menuCode) return null;

  const record = {
    brandId: getActiveBrandId(),
    menuCode,
    menuName: text(snapshot?.menuName),
    size: text(snapshot?.size) || '단일',
    components: safeComponents(snapshot?.components),
    selectedRecipeGroupIds: Array.isArray(snapshot?.selectedRecipeGroupIds)
      ? snapshot.selectedRecipeGroupIds.map(text).filter(Boolean)
      : [],
    totalCost: Number.isFinite(Number(snapshot?.totalCost)) ? Number(snapshot.totalCost) : null,
    costRate: Number.isFinite(Number(snapshot?.costRate)) ? Number(snapshot.costRate) : null,
    at: new Date().toISOString(),
  };

  await runTransaction([RECIPE_VERSIONS_STORE], 'readwrite', tx => {
    tx.objectStore(RECIPE_VERSIONS_STORE).add(record);
  });

  await pruneOldVersions(menuCode);
  return record;
}

async function pruneOldVersions(menuCode) {
  const rows = await getRecipeVersionsForMenu(menuCode);
  if (rows.length <= MAX_VERSIONS_PER_MENU) return;
  const toDelete = rows.slice(MAX_VERSIONS_PER_MENU).map(r => r.id);
  if (toDelete.length === 0) return;
  await runTransaction([RECIPE_VERSIONS_STORE], 'readwrite', tx => {
    const store = tx.objectStore(RECIPE_VERSIONS_STORE);
    for (const id of toDelete) store.delete(id);
  });
}

/** 메뉴코드 기준 스냅샷 목록, 최신순. */
export async function getRecipeVersionsForMenu(menuCode) {
  if (!hasStore(RECIPE_VERSIONS_STORE)) return [];
  const code = text(menuCode);
  if (!code) return [];
  const rows = await getAll(RECIPE_VERSIONS_STORE);
  return rows
    .filter(r => r.menuCode === code)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

function componentKey(c) {
  return c.productCode || c.ingredientName;
}

/**
 * 두 스냅샷(또는 스냅샷 형태 객체)의 구성품 차이를 계산한다.
 * @returns {{ added: [], removed: [], changed: [{key,label,before,after}], costDelta: number|null }}
 */
export function diffRecipeVersions(before, after) {
  const beforeMap = new Map(safeComponents(before?.components).map(c => [componentKey(c), c]));
  const afterMap = new Map(safeComponents(after?.components).map(c => [componentKey(c), c]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [key, c] of afterMap) {
    if (!beforeMap.has(key)) added.push(c);
  }
  for (const [key, c] of beforeMap) {
    if (!afterMap.has(key)) removed.push(c);
  }
  for (const [key, afterC] of afterMap) {
    const beforeC = beforeMap.get(key);
    if (!beforeC) continue;
    if (beforeC.quantity !== afterC.quantity || beforeC.unitPrice !== afterC.unitPrice) {
      changed.push({
        key,
        label: afterC.ingredientName || key,
        before: { quantity: beforeC.quantity, unitPrice: beforeC.unitPrice },
        after: { quantity: afterC.quantity, unitPrice: afterC.unitPrice },
      });
    }
  }

  const beforeCost = Number.isFinite(Number(before?.totalCost)) ? Number(before.totalCost) : null;
  const afterCost = Number.isFinite(Number(after?.totalCost)) ? Number(after.totalCost) : null;
  const costDelta = beforeCost != null && afterCost != null ? afterCost - beforeCost : null;

  return { added, removed, changed, costDelta };
}
