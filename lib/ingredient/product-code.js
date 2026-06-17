/**
 * lib/ingredient/product-code.js — productCode 식별·중복 처리 순수 로직
 *
 * cost_ingredients의 productCode 정규화, 동일 코드 그룹화, "보존 우선순위" 비교,
 * 중복 진단을 담당한다. DB 접근이 없는 순수 함수 모음이라 단위 테스트가 쉽다.
 * store.js가 import해서 CRUD/삭제/복구/진단에 사용하며, 공개 함수는 re-export된다.
 */

/** productCode를 비교용 키로 정규화 (trim + 소문자) */
export function productCodeKey(productCode) {
  return String(productCode || '')
    .trim()
    .toLowerCase();
}

/** 보존 우선순위 랭크 — 낮을수록 우선 보존 (정상 < 단종 < 제외) */
function ingredientKeepRank(row) {
  if (row?.excluded) return 2;
  if (row?.discontinued) return 1;
  return 0;
}

/**
 * 중복 그룹에서 "보존할 레코드"가 앞에 오도록 정렬하는 비교자.
 * 우선순위: keepRank ↑ → updatedAt 최신 → id 큰 순.
 */
export function compareIngredientKeep(a, b) {
  const rankDiff = ingredientKeepRank(a) - ingredientKeepRank(b);
  if (rankDiff !== 0) return rankDiff;
  const ta = Date.parse(a?.updatedAt || '');
  const tb = Date.parse(b?.updatedAt || '');
  const ua = Number.isFinite(ta) ? ta : 0;
  const ub = Number.isFinite(tb) ? tb : 0;
  if (ub !== ua) return ub - ua;
  return (Number(b?.id) || 0) - (Number(a?.id) || 0);
}

/** rows를 정규화된 productCode → 레코드 배열 맵으로 그룹화 (코드 없는 행 제외) */
export function recordsByProductCode(rows) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = productCodeKey(row?.productCode);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

/** 동일 productCode 그룹에서 보존 우선순위가 가장 높은 레코드 1개 반환 */
export function findIngredientByProductCode(rows, productCode) {
  const group = recordsByProductCode(rows).get(productCodeKey(productCode)) || [];
  return [...group].sort(compareIngredientKeep)[0] || null;
}

/** 동일 productCode를 가진 모든 레코드 배열 반환 */
export function findIngredientsByProductCode(rows, productCode) {
  return recordsByProductCode(rows).get(productCodeKey(productCode)) || [];
}

/** productCode가 이미 존재하면 throw (currentId는 자기 자신 제외) */
export function assertUniqueProductCode(rows, productCode, currentId = null) {
  const key = productCodeKey(productCode);
  if (!key) return;
  const duplicate = (Array.isArray(rows) ? rows : []).find(row => {
    if (productCodeKey(row?.productCode) !== key) return false;
    if (currentId == null) return true;
    return Number(row.id) !== Number(currentId);
  });
  if (duplicate) {
    throw new Error(`이미 등록된 제품코드입니다: ${String(productCode).trim()}`);
  }
}

/**
 * productCode 중복 진단 — 중복 그룹/보존·삭제 대상/중복 행 수를 계산.
 * @param {object[]} rows
 * @returns {{ groups, groupCount, duplicateRows, hasDuplicates }}
 */
export function buildIngredientProductCodeDuplicateDiagnostics(rows = []) {
  const groups = [...recordsByProductCode(rows).entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => {
      const ordered = [...items].sort(compareIngredientKeep);
      const keep = ordered[0];
      const remove = ordered.slice(1);
      return {
        key,
        productCode: String(keep?.productCode || items[0]?.productCode || '').trim(),
        count: items.length,
        keepId: keep?.id ?? null,
        keepName: keep?.ingredientName || keep?.productName || keep?.displayName || '',
        removeIds: remove.map(row => row.id).filter(id => id != null),
        removeNames: remove.map(row => row.ingredientName || row.productName || row.displayName || ''),
      };
    });
  const duplicateRows = groups.reduce((sum, group) => sum + Math.max(0, group.count - 1), 0);
  return {
    groups,
    groupCount: groups.length,
    duplicateRows,
    hasDuplicates: duplicateRows > 0,
  };
}
