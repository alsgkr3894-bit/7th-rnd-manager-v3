/**
 * lib/cost/price-history.js — 식자재 단가 변경 이력 CRUD
 *
 * store: cost_ingredient_price_history
 * 필드: id (autoIncrement), ingredientId, productCode, ingredientName,
 *       oldPrice, newPrice, source ('register'|'bulk'|'edit'), changedAt
 *
 * 기록 실패가 단가 저장을 깨뜨려선 안 되므로 recordPriceChange는
 * 내부 예외를 삼키고 console.warn만 남긴다.
 */
import { getAll, getByIndex, put, hasStore } from '@/lib/db';

const STORE = 'cost_ingredient_price_history';

// ── 레코드 빌더 (순수 함수 — 테스트 가능) ────────────────────────
/**
 * @param {{ ingredientId, productCode, ingredientName, oldPrice, newPrice, source }} params
 * @param {string} changedAt ISO 문자열 (주입 가능)
 * @returns {object} DB에 넣을 레코드 객체 (id 제외 — autoIncrement)
 */
export function buildHistoryRecord(
  { ingredientId, productCode, ingredientName, oldPrice, newPrice, source },
  changedAt,
) {
  return {
    ingredientId,
    productCode:    productCode    ?? null,
    ingredientName: ingredientName ?? null,
    oldPrice:       oldPrice       ?? null,
    newPrice,
    source,
    changedAt,
  };
}

// ── 공개 API ──────────────────────────────────────────────────────

/**
 * 단가 변경 이력을 한 건 기록한다.
 *
 * - oldPrice === newPrice 이거나 newPrice == null이면 NO-OP (조용히 반환).
 * - DB store가 없으면 NO-OP.
 * - 예외는 절대 호출자로 전파하지 않는다.
 *
 * @param {{ ingredientId, productCode, ingredientName, oldPrice, newPrice, source }} params
 * @returns {Promise<void>}
 */
export async function recordPriceChange({
  ingredientId,
  productCode,
  ingredientName,
  oldPrice,
  newPrice,
  source,
}) {
  // NO-OP 가드: 가격 변동 없음 또는 newPrice 미제공
  if (newPrice == null) return;
  if (oldPrice === newPrice) return;

  try {
    if (!hasStore(STORE)) return;

    const record = buildHistoryRecord(
      { ingredientId, productCode, ingredientName, oldPrice, newPrice, source },
      new Date().toISOString(),
    );
    await put(STORE, record);
  } catch (err) {
    console.warn('[price-history] 이력 기록 실패 (무시됨):', err);
  }
}

/**
 * 특정 식자재의 단가 변경 이력 목록 (changedAt 내림차순).
 *
 * @param {number|string} ingredientId
 * @returns {Promise<object[]>}
 */
export async function getHistoryByIngredient(ingredientId) {
  if (!hasStore(STORE)) return [];
  try {
    const rows = await getByIndex(STORE, 'ingredientId', ingredientId);
    return rows.slice().sort((a, b) => (b.changedAt > a.changedAt ? 1 : -1));
  } catch (err) {
    console.warn('[price-history] getHistoryByIngredient 실패:', err);
    return [];
  }
}

/**
 * 전체 단가 변경 이력 (changedAt 내림차순).
 *
 * @returns {Promise<object[]>}
 */
export async function getAllHistory() {
  if (!hasStore(STORE)) return [];
  try {
    const rows = await getAll(STORE);
    return rows.slice().sort((a, b) => (b.changedAt > a.changedAt ? 1 : -1));
  } catch (err) {
    console.warn('[price-history] getAllHistory 실패:', err);
    return [];
  }
}
