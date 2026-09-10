/**
 * lib/stats/menu-cost-change-stats.js — 홈 대시보드 "원가 변동한 메뉴" 위젯 데이터.
 *
 * 원가 변동 이력을 위한 새 스토어는 두지 않는다 — 최근 단가파일 2건(직전/최신)의
 * price_rows를 각각 현재 menu_recipes에 대입해 그 시점 원가를 재계산하고 비교한다
 * (lib/cost/history/price-file-cost.js). 단가파일이 1개뿐이면 비교할 이전 시점이
 * 없다는 뜻이라 빈 목록 + reason:'NO_BASELINE'을 반환한다.
 *
 * 브랜드+파일ID 조합으로 모듈 스코프 캐시 — 단가 업로드/레시피 저장 시 무효화한다.
 */
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { onPriceUpload } from '@/lib/price/price-events';
import { getAllMenuMaster } from '@/lib/menu-master';
import { loadMenuRecipeMaps } from '@/lib/menu-recipes';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getActiveBrandId } from '@/lib/active-brand';
import { hasStore } from '@/lib/db';
import {
  buildMenuCostMap,
  buildPriceRowMap,
  diffMenuCostMaps,
} from '@/lib/cost/history/price-file-cost';

let cache = null; // { key, result }

/** 단가 업로드가 일어나면 다음 조회에서 새로 계산하도록 캐시를 비운다. */
onPriceUpload(() => {
  cache = null;
});

/** 레시피 저장 등 캐시를 무효화해야 하는 다른 이벤트에서 수동으로 호출. */
export function invalidateMenuCostChangeCache() {
  cache = null;
}

const EMPTY_RESULT = { items: [], baseDate: null, targetDate: null, total: 0 };

/**
 * @returns {Promise<{items: Array, baseDate: string|null, targetDate: string|null,
 *   total: number, reason?: 'NO_BASELINE'}>}
 */
export async function getMenuCostChanges() {
  if (!hasStore('price_files') || !hasStore('price_rows') || !hasStore('menu_recipes')) {
    return EMPTY_RESULT;
  }

  const files = await getPriceFiles().catch(() => []);
  if (files.length < 2) {
    return { ...EMPTY_RESULT, targetDate: files[0]?.updateDate ?? null, reason: 'NO_BASELINE' };
  }

  const [latestFile, prevFile] = files;
  const brandId = getActiveBrandId();
  const key = `${brandId}:${prevFile.id}:${latestFile.id}`;
  if (cache?.key === key) return cache.result;

  const [menus, recipeMaps, ingredients, recipeGroups, prevRows, latestRows] = await Promise.all([
    getAllMenuMaster(),
    loadMenuRecipeMaps(),
    getAllIngredients(),
    getAllRecipeGroups(),
    getPriceRowsByFileId(prevFile.id),
    getPriceRowsByFileId(latestFile.id),
  ]);

  const beforeMap = buildMenuCostMap({
    menus,
    recipeMaps,
    ingredients,
    recipeGroups,
    priceRowMap: buildPriceRowMap(prevRows),
  });
  const afterMap = buildMenuCostMap({
    menus,
    recipeMaps,
    ingredients,
    recipeGroups,
    priceRowMap: buildPriceRowMap(latestRows),
  });

  const items = diffMenuCostMaps(beforeMap, afterMap);
  const result = {
    items,
    baseDate: prevFile.updateDate ?? null,
    targetDate: latestFile.updateDate ?? null,
    total: items.length,
  };
  cache = { key, result };
  return result;
}
