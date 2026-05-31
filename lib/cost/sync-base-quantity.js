/**
 * lib/cost/sync-base-quantity.js — 제때 단가 파일 수량 → 식자재 기준수량 동기화
 *
 * 분리 원칙:
 *   - buildSyncPlan : 순수 함수 (DB 접근 없음, 테스트 가능)
 *   - applySyncPlan : DB 기록 함수 (cost_ingredients.baseQuantity 만 덮어씀)
 *
 * 매칭 기준: price_rows.productCode ↔ cost_ingredients.productCode
 *             (trim + 소문자 정규화, 대소문자·앞뒤공백 무시)
 *
 * 스킵 조건 (buildSyncPlan):
 *   - price row의 quantity가 null / 0 / 음수 / NaN
 *   - 매칭되는 ingredient가 없는 price row
 *   - 이미 동일한 값인 경우 (unchanged 로 집계)
 */

import { getById, bulkPut, hasStore } from '@/lib/db';

// ── 내부 헬퍼 ────────────────────────────────────────────────

/** productCode 정규화: trim + 소문자. 매칭 키 생성용. */
function normalizeCode(s) {
  return (s == null ? '' : String(s)).trim().toLowerCase();
}

/**
 * 수량 값을 파싱. 유효하지 않으면 null 반환.
 * - null / undefined / '' / NaN → null
 * - 0 이하 → null (포장단위가 0인 것은 의미 없음)
 *
 * @param {*} raw
 * @returns {number|null}
 */
function parseQty(raw) {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '').trim());
  if (!isFinite(n) || isNaN(n) || n <= 0) return null;
  return n;
}

// ── 공개 API ─────────────────────────────────────────────────

/**
 * 제때 단가 파일 rows와 cost_ingredients 목록을 비교해 동기화 계획을 반환.
 * 순수 함수 — DB 접근 없음.
 *
 * @param {Array<{
 *   productCode: string,
 *   quantity:    number|null,
 *   salesUnit?:  string,
 *   productName?: string,
 * }>} priceRows  - getPriceRowsByFileId() 결과
 *
 * @param {Array<{
 *   id:            number,
 *   productCode:   string,
 *   ingredientName?: string,
 *   baseQuantity?: number|null,
 *   baseUnitType?: string,
 * }>} ingredients - getAllIngredients() 결과 (cost_ingredients)
 *
 * @returns {{
 *   changes:   { id: number, productCode: string, name: string,
 *                oldQty: number|null, newQty: number, unit: string }[],
 *   unchanged: number,
 *   unmatched: number,
 * }}
 */
export function buildSyncPlan(priceRows, ingredients) {
  if (!Array.isArray(priceRows))   priceRows   = [];
  if (!Array.isArray(ingredients)) ingredients = [];

  // cost_ingredients를 정규화 코드 → record 맵으로 인덱싱
  const ingMap = new Map();
  for (const ing of ingredients) {
    if (!ing.productCode) continue;
    ingMap.set(normalizeCode(ing.productCode), ing);
  }

  const changes   = [];
  let unchanged   = 0;
  let unmatched   = 0;

  for (const row of priceRows) {
    const newQty = parseQty(row.quantity);
    if (newQty === null) continue; // 수량 없음 → 스킵

    const key = normalizeCode(row.productCode);
    const ing = ingMap.get(key);
    if (!ing) {
      unmatched++;
      continue;
    }

    const oldQty = ing.baseQuantity ?? null;

    // 이미 동일하면 unchanged
    if (oldQty === newQty) {
      unchanged++;
      continue;
    }

    changes.push({
      id:          ing.id,
      productCode: ing.productCode || row.productCode,
      name:        ing.ingredientName || row.productName || ing.productCode || row.productCode,
      oldQty,
      newQty,
      unit:        ing.baseUnitType || row.salesUnit || 'g',
    });
  }

  return { changes, unchanged, unmatched };
}

/**
 * buildSyncPlan().changes 배열을 cost_ingredients에 적용.
 * baseQuantity 필드만 덮어쓰고 updatedAt을 갱신한다. 다른 필드는 보존.
 *
 * @param {{ id: number }[]} changes - buildSyncPlan의 changes 배열
 * @returns {Promise<number>} 실제로 적용된 레코드 수
 */
export async function applySyncPlan(changes) {
  if (!Array.isArray(changes) || changes.length === 0) return 0;
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');

  const now = new Date().toISOString();

  // 현재 레코드를 병렬 조회 (혹시 사이에 변경된 경우 대비)
  const existing = await Promise.all(
    changes.map(c => getById('cost_ingredients', c.id))
  );

  const records = [];
  for (let i = 0; i < changes.length; i++) {
    const rec = existing[i];
    if (!rec) continue; // 조회 중 삭제된 레코드는 스킵
    records.push({
      ...rec,
      baseQuantity: changes[i].newQty,
      updatedAt:    now,
    });
  }

  if (records.length === 0) return 0;
  await bulkPut('cost_ingredients', records);
  return records.length;
}
