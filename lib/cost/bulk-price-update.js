/**
 * lib/cost/bulk-price-update.js — 식자재 일괄 가격 업데이트 로직
 *
 * 순수 함수 (parseBulkPriceRows, matchAndApply)와
 * DB 기록 함수 (commitBulkPrice)로 분리.
 *
 * 업데이트 대상 필드: cost_ingredients.priceOverride
 */

import { parseAmount } from '@/lib/format';
import { getById, bulkPut, hasStore } from '@/lib/db';
import { recordPriceChange } from '@/lib/cost/price-history';

// ── 헤더 후보 목록 (Korean + English 혼용 허용) ────────────────

const CODE_HEADERS  = ['상품코드', '제품코드', '코드', 'productCode', 'code'];
const NAME_HEADERS  = ['재료명', '품목명', '제품명', '식자재명', 'ingredientName', 'name'];
const PRICE_HEADERS = ['단가', '가격', '부가세포함가', '단가(원)', '가격(원)', 'price', 'priceOverride'];

/**
 * 헤더 배열에서 후보 목록 중 첫 번째 매칭되는 헤더 반환.
 * @param {string[]} headers
 * @param {string[]} candidates
 * @returns {string|null}
 */
function matchHeader(headers, candidates) {
  for (const c of candidates) {
    const found = headers.find(h => String(h).trim() === c);
    if (found !== undefined) return found;
  }
  return null;
}

/**
 * 파싱된 시트 행 배열을 정규화된 형태로 변환.
 *
 * @param {object[]} rows - sheet_to_json 결과 (헤더→값 객체 배열)
 * @returns {{ productCode: string, ingredientName?: string, newPrice: number }[]}
 */
export function parseBulkPriceRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const headers = Object.keys(rows[0] || {});
  const codeKey  = matchHeader(headers, CODE_HEADERS);
  const nameKey  = matchHeader(headers, NAME_HEADERS);
  const priceKey = matchHeader(headers, PRICE_HEADERS);

  const result = [];
  for (const row of rows) {
    const rawCode  = codeKey  ? String(row[codeKey]  ?? '').trim() : '';
    const rawName  = nameKey  ? String(row[nameKey]  ?? '').trim() : undefined;
    const rawPrice = priceKey ? row[priceKey] : undefined;

    // 상품코드가 없으면 스킵
    if (!rawCode) continue;

    // 가격 파싱: parseAmount는 콤마·원 등 제거 후 Number 변환
    const newPrice = parseAmount(rawPrice);
    // 유효하지 않은 가격(0 이하 포함) 스킵
    if (!newPrice || newPrice <= 0) continue;

    const entry = { productCode: rawCode, newPrice };
    if (rawName) entry.ingredientName = rawName;
    result.push(entry);
  }
  return result;
}

/**
 * 파싱된 행과 기존 식자재 목록을 매칭하여 미리보기 diff 반환 (순수 함수, DB 접근 없음).
 *
 * 매칭 기준: productCode (대소문자·앞뒤공백 무시)
 *
 * @param {{ productCode: string, ingredientName?: string, newPrice: number }[]} parsedRows
 * @param {{ id: number|string, productCode: string, ingredientName: string, priceOverride?: number|null }[]} existingIngredients
 * @returns {{
 *   matched: { id: number|string, productCode: string, name: string, oldPrice: number|null, newPrice: number }[],
 *   unmatched: { productCode: string, newPrice: number }[]
 * }}
 */
export function matchAndApply(parsedRows, existingIngredients) {
  // 기존 식자재를 정규화된 productCode → record 맵으로 인덱싱
  const existingMap = new Map();
  for (const ing of existingIngredients) {
    if (!ing.productCode) continue;
    const key = String(ing.productCode).trim().toLowerCase();
    existingMap.set(key, ing);
  }

  const matched = [];
  const unmatched = [];

  for (const row of parsedRows) {
    const key = row.productCode.toLowerCase();
    const ing = existingMap.get(key);
    if (ing) {
      matched.push({
        id:          ing.id,
        productCode: ing.productCode,
        name:        ing.ingredientName || row.ingredientName || ing.productCode,
        oldPrice:    ing.priceOverride ?? null,
        newPrice:    row.newPrice,
      });
    } else {
      unmatched.push({ productCode: row.productCode, newPrice: row.newPrice });
    }
  }

  return { matched, unmatched };
}

/**
 * matched diff 배열의 각 항목을 cost_ingredients의 priceOverride에 기록.
 *
 * - 기존 레코드를 getById로 읽어 다른 필드를 보존
 * - updatedAt을 현재 시각으로 갱신
 * - bulkPut으로 한 번에 저장 (500건 초과 시 청크 자동 분할)
 *
 * @param {{ id: number|string, productCode: string, name: string, oldPrice: number|null, newPrice: number }[]} matched
 * @returns {Promise<number>} 업데이트된 레코드 수
 */
export async function commitBulkPrice(matched) {
  if (!Array.isArray(matched) || matched.length === 0) return 0;
  if (!hasStore('cost_ingredients')) throw new Error('cost_ingredients store 없음');

  const now = new Date().toISOString();

  // 기존 레코드를 병렬 조회 (순서 보장)
  const existing = await Promise.all(
    matched.map(item => getById('cost_ingredients', item.id))
  );

  const records = [];
  for (let i = 0; i < matched.length; i++) {
    const rec = existing[i];
    if (!rec) continue; // 동시 삭제된 경우 스킵
    records.push({
      ...rec,
      priceOverride: matched[i].newPrice,
      updatedAt: now,
    });
  }

  if (records.length === 0) return 0;
  await bulkPut('cost_ingredients', records);

  // 이력 기록 (best-effort — 실패해도 가격 저장에 영향 없음)
  const historyTasks = [];
  for (let i = 0; i < matched.length; i++) {
    const rec = existing[i];
    if (!rec) continue;
    const item = matched[i];
    historyTasks.push(
      recordPriceChange({
        ingredientId:   item.id,
        productCode:    item.productCode,
        ingredientName: item.name,
        oldPrice:       item.oldPrice,
        newPrice:       item.newPrice,
        source:         'bulk',
      }),
    );
  }
  await Promise.allSettled(historyTasks);

  return records.length;
}
