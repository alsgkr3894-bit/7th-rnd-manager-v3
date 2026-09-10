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
import { getAll, getByIndex, runTransaction, hasStore } from '@/lib/db';
import { getActiveBrandId } from '@/lib/active-brand';
import { getAllMenuMaster } from './store';
import { getAllMenuRecipes, upsertMenuRecipe } from '@/lib/menu-recipes';
import { recipeStoreKindForCategory } from '@/lib/recipe-master/sync';
import { componentSubtotal } from '@/lib/cost/shared/calc';

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
    sellingPrice: Number.isFinite(Number(snapshot?.sellingPrice))
      ? Number(snapshot.sellingPrice)
      : null,
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

/**
 * 메뉴코드 기준 스냅샷 목록, 최신순.
 *
 * getAll로 전체 스토어를 훑지 않고 menuCode 인덱스로 바로 조회한다(메뉴가 많아지면
 * 전체 스캔 비용이 커짐). 멀티브랜드 도입 전에 쌓인 레거시 행은 brandId가 없으므로
 * 그대로 보존하고, brandId가 있는 행은 현재 활성 브랜드와 같은 것만 남긴다 —
 * 그렇지 않으면 다른 브랜드의 이력이 이 메뉴의 변경 이력에 섞여 보인다.
 */
export async function getRecipeVersionsForMenu(menuCode) {
  if (!hasStore(RECIPE_VERSIONS_STORE)) return [];
  const code = text(menuCode);
  if (!code) return [];
  const activeBrandId = getActiveBrandId();
  const rows = await getByIndex(RECIPE_VERSIONS_STORE, 'menuCode', code);
  return rows
    .filter(r => r.brandId == null || r.brandId === activeBrandId)
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
    const quantityChanged = beforeC.quantity !== afterC.quantity;
    const priceChanged = beforeC.unitPrice !== afterC.unitPrice;
    if (quantityChanged || priceChanged) {
      const subtotalBefore = componentSubtotal(beforeC);
      const subtotalAfter = componentSubtotal(afterC);
      changed.push({
        key,
        label: afterC.ingredientName || key,
        before: { quantity: beforeC.quantity, unitPrice: beforeC.unitPrice },
        after: { quantity: afterC.quantity, unitPrice: afterC.unitPrice },
        quantityChanged,
        priceChanged,
        subtotalBefore,
        subtotalAfter,
        subtotalDelta: subtotalAfter - subtotalBefore,
      });
    }
  }

  const beforeCost = Number.isFinite(Number(before?.totalCost)) ? Number(before.totalCost) : null;
  const afterCost = Number.isFinite(Number(after?.totalCost)) ? Number(after.totalCost) : null;
  const costDelta = beforeCost != null && afterCost != null ? afterCost - beforeCost : null;

  const beforeCostRate = Number.isFinite(Number(before?.costRate)) ? Number(before.costRate) : null;
  const afterCostRate = Number.isFinite(Number(after?.costRate)) ? Number(after.costRate) : null;
  const costRateDelta =
    beforeCostRate != null && afterCostRate != null ? afterCostRate - beforeCostRate : null;

  return {
    added,
    removed,
    changed,
    costDelta,
    beforeCost,
    afterCost,
    beforeCostRate,
    afterCostRate,
    costRateDelta,
  };
}

/**
 * "고아" 스냅샷을 찾는다 — 메뉴코드 변경 캐스케이드 도중 구성품이 덮어써져 사라진
 * 레시피(수정 전 이 파일의 버그)처럼, 과거 스냅샷엔 구성품이 있는데 현재 저장된
 * 레시피는 비어 있는 메뉴. 메뉴마스터에서 아예 사라진 menuCode의 스냅샷도 포함한다
 * (코드가 여러 번 바뀌어 최종적으로 어느 메뉴와도 안 이어지는 경우).
 *
 * @returns {Promise<Array<{menuCode, menuName, lastGoodVersion, currentComponentCount}>>}
 */
export async function findOrphanRecipeVersions() {
  if (!hasStore(RECIPE_VERSIONS_STORE)) return [];

  const [versions, menus, recipes] = await Promise.all([
    getAll(RECIPE_VERSIONS_STORE),
    getAllMenuMaster(),
    getAllMenuRecipes(),
  ]);

  const activeBrandId = getActiveBrandId();
  const menuCodeSet = new Set(menus.map(m => text(m?.menuCode)).filter(Boolean));
  const recipeComponentCountByCode = new Map(
    recipes.map(r => [text(r?.menuCode), (r?.components || []).length])
  );

  const latestByCode = new Map();
  for (const v of versions) {
    if (v.brandId != null && v.brandId !== activeBrandId) continue;
    const code = text(v.menuCode);
    if (!code || (v.components || []).length === 0) continue;
    const current = latestByCode.get(code);
    if (!current || String(v.at) > String(current.at)) latestByCode.set(code, v);
  }

  const orphans = [];
  for (const [code, lastGoodVersion] of latestByCode) {
    const stillLinkedToMenu = menuCodeSet.has(code);
    const currentComponentCount = recipeComponentCountByCode.get(code) ?? 0;
    if (!stillLinkedToMenu || currentComponentCount === 0) {
      orphans.push({
        menuCode: code,
        menuName: lastGoodVersion.menuName,
        lastGoodVersion,
        currentComponentCount,
        menuExists: stillLinkedToMenu,
      });
    }
  }
  return orphans.sort((a, b) =>
    String(b.lastGoodVersion.at).localeCompare(String(a.lastGoodVersion.at))
  );
}

/**
 * 고아 스냅샷의 구성품을 현재 레시피로 되살린다. 대상 메뉴가 실제로 메뉴마스터에
 * 존재할 때만 허용한다(존재하지 않는 menuCode로 레시피만 되살리면 다시 고아가 됨).
 */
export async function restoreRecipeFromVersion(version) {
  const menuCode = text(version?.menuCode);
  if (!menuCode) throw new Error('menuCode가 없습니다');
  const menus = await getAllMenuMaster();
  const menu = menus.find(m => text(m?.menuCode) === menuCode);
  if (!menu) throw new Error('메뉴마스터에서 이 메뉴를 찾을 수 없습니다 — 복구할 수 없습니다');

  await upsertMenuRecipe({
    menuCode,
    menuName: menu.menuName || version.menuName || '',
    category: menu.category || '',
    kind: recipeStoreKindForCategory(menu.category),
    size: version.size || menu.size || '단일',
    components: version.components || [],
    selectedRecipeGroupIds: version.selectedRecipeGroupIds || [],
  });
  return { menuCode, restoredCount: (version.components || []).length };
}
