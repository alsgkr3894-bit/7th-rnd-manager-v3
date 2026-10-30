/**
 * lib/cost/price-rise-service.js — 단가 상승 알림용 데이터 로드 + 계산(DB 접근)
 *
 * 순수 계산은 lib/cost/price-rise.js. 여기서는 필요한 데이터를 읽어 두 시점의 단가표를 만든다.
 *  - 제때 단가 업로드: 직전 단가파일 → 방금 올린(최신) 단가파일
 *  - 식자재 수동 단가 저장: 저장 전 식자재 목록 → 저장 후 식자재 목록 (단가파일은 최신 것 그대로)
 * 결과는 { source, label, baseDate, targetDate, items, ingredientRises, total }.
 */
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import { loadMenuRecipeMaps } from '@/lib/menu-recipes';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { buildPriceRowMap } from '@/lib/cost/history/price-file-cost';
import { buildUnitPriceMap } from '@/lib/recipe';
import { findMenuCostRises } from '@/lib/cost/price-rise';
import { asDisplayText } from '@/lib/ui/prop-guards';

export const PRICE_RISE_SOURCE = { JETTE: 'jette', MANUAL: 'manual' };

const EMPTY = items => ({ items, ingredientRises: [], total: 0 });

async function loadMenuContext() {
  const [menus, recipeMaps, recipeGroups] = await Promise.all([
    getAllMenuMaster(),
    loadMenuRecipeMaps(),
    getAllRecipeGroups(),
  ]);
  return { menus, recipeMaps, recipeGroups };
}

/**
 * 방금 올린 제때 단가파일(최신) vs 직전 파일. 파일이 하나뿐이면 비교할 이전 단가가 없다.
 * uploadedDate를 주면, 그 날짜가 최신 파일이 아닐 때(과거 날짜로 올린 파일)는 현재 단가가 바뀐 게
 * 아니므로 비교하지 않는다.
 */
export async function computeJetteUploadRises(uploadedDate = '') {
  const files = await getPriceFiles().catch(() => []);
  const none = { source: PRICE_RISE_SOURCE.JETTE, baseDate: null, targetDate: null, ...EMPTY([]) };
  if (!Array.isArray(files) || files.length < 2) return none;
  const [latestFile, prevFile] = files;
  if (uploadedDate && asDisplayText(latestFile.updateDate) !== asDisplayText(uploadedDate)) {
    return none;
  }
  const [context, ingredients, prevRows, latestRows] = await Promise.all([
    loadMenuContext(),
    getAllIngredients(),
    getPriceRowsByFileId(prevFile.id),
    getPriceRowsByFileId(latestFile.id),
  ]);
  const found = findMenuCostRises({
    ...context,
    beforeMap: buildUnitPriceMap(ingredients, buildPriceRowMap(prevRows)),
    afterMap: buildUnitPriceMap(ingredients, buildPriceRowMap(latestRows)),
  });
  return {
    source: PRICE_RISE_SOURCE.JETTE,
    baseDate: asDisplayText(prevFile.updateDate) || null,
    targetDate: asDisplayText(latestFile.updateDate) || null,
    ...found,
    total: found.items.length,
  };
}

/**
 * 식자재 수동 단가(또는 포장수량·단위) 저장 전/후 식자재 목록으로 비교한다.
 * 단가파일은 최신 파일 하나만 쓰므로 제때 단가는 변하지 않고, 바뀐 식자재만 영향이 잡힌다.
 *
 * @param {object[]} beforeIngredients 저장 전 getAllIngredients() 결과
 * @param {object[]} afterIngredients  저장 후 getAllIngredients() 결과
 * @param {string} [label] 팝업에 보일 설명(예: 식자재 이름)
 */
export async function computeManualPriceRises(beforeIngredients, afterIngredients, label = '') {
  const files = await getPriceFiles().catch(() => []);
  const latestFile = Array.isArray(files) ? files[0] : null;
  const latestRows = latestFile ? await getPriceRowsByFileId(latestFile.id) : [];
  const priceRowMap = buildPriceRowMap(latestRows);
  const context = await loadMenuContext();
  const found = findMenuCostRises({
    ...context,
    beforeMap: buildUnitPriceMap(beforeIngredients, priceRowMap),
    afterMap: buildUnitPriceMap(afterIngredients, priceRowMap),
  });
  return {
    source: PRICE_RISE_SOURCE.MANUAL,
    label: asDisplayText(label),
    baseDate: null,
    targetDate: null,
    ...found,
    total: found.items.length,
  };
}
