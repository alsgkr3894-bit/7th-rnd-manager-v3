/**
 * lib/nutrition/values/dedup.js — 영양성분 메뉴/값 중복 판정·진단 순수 로직
 *
 * nutrition_menu_ref / nutrition_raw_values의 키 정규화, 보존 우선순위 비교, 그룹 압축,
 * 중복 진단을 담당한다. DB 접근이 없는 순수 함수 — store.js가 import해서 CRUD/복구/조회에
 * 사용하며, 공개 함수(buildRawValueMapFromRows·buildNutritionBaseDuplicateDiagnostics)는 re-export된다.
 */

function cleanKey(value) {
  return String(value ?? '').trim();
}

/** updatedAt(최신)·id(큰 값) 기준 보존 우선순위 랭크 */
function recordFreshness(row) {
  const updatedAt = Date.parse(row?.updatedAt || '');
  const updatedRank = Number.isFinite(updatedAt) ? updatedAt : 0;
  const idRank = Number(row?.id) || 0;
  return { updatedRank, idRank };
}

/** 보존할 레코드가 앞에 오도록 정렬 (최신 updatedAt → 큰 id) */
export function compareKeepRecord(a, b) {
  const fa = recordFreshness(a);
  const fb = recordFreshness(b);
  if (fb.updatedRank !== fa.updatedRank) return fb.updatedRank - fa.updatedRank;
  return fb.idRank - fa.idRank;
}

/** 동일 그룹에서 보존할 레코드 1개 */
export function pickKeepRecord(rows) {
  return [...(Array.isArray(rows) ? rows : [])].sort(compareKeepRecord)[0] || null;
}

/** 메뉴 ref 그룹 키 (menuCode) */
export function menuRefKey(row) {
  return cleanKey(row?.menuCode);
}

/** 영양값 그룹 키 (menuCode__crustType) */
export function rawValueKey(row) {
  const menuCode = cleanKey(row?.menuCode);
  const crustType = cleanKey(row?.crustType);
  return menuCode && crustType ? `${menuCode}__${crustType}` : '';
}

/** 키별로 보존 레코드만 남겨 압축 */
export function compactRecordsByKey(rows, keyOf) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = keyOf(row);
    if (!key) continue;
    const current = map.get(key);
    if (!current || compareKeepRecord(row, current) < 0) map.set(key, row);
  }
  return [...map.values()];
}

/** 중복(2건 이상) 그룹 목록 — keep/remove id 포함 */
function duplicateGroups(rows, keyOf, labelOf) {
  const grouped = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = keyOf(row);
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  return [...grouped.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => {
      const ordered = [...items].sort(compareKeepRecord);
      const keep = ordered[0];
      const remove = ordered.slice(1);
      return {
        key,
        label: labelOf?.(keep) || key,
        count: items.length,
        keepId: keep?.id ?? null,
        removeIds: remove.map(row => row.id).filter(id => id != null),
      };
    });
}

function duplicateSummary(menuGroups, rawGroups) {
  const duplicateMenuRows = menuGroups.reduce(
    (sum, group) => sum + Math.max(0, group.count - 1),
    0
  );
  const duplicateRawRows = rawGroups.reduce((sum, group) => sum + Math.max(0, group.count - 1), 0);
  return {
    menuGroups,
    rawGroups,
    menuGroupCount: menuGroups.length,
    rawGroupCount: rawGroups.length,
    duplicateMenuRows,
    duplicateRawRows,
    duplicateRows: duplicateMenuRows + duplicateRawRows,
    hasDuplicates: duplicateMenuRows + duplicateRawRows > 0,
  };
}

/** raw value 행 배열을 `menuCode__crustType` → 보존행 맵으로 변환 */
export function buildRawValueMapFromRows(rows) {
  const map = {};
  for (const row of compactRecordsByKey(rows, rawValueKey)) {
    const key = rawValueKey(row);
    if (key) map[key] = row;
  }
  return map;
}

/** 메뉴 ref·영양값 중복 진단 요약 */
export function buildNutritionBaseDuplicateDiagnostics({ menuRefs = [], rawValues = [] } = {}) {
  const menuGroups = duplicateGroups(
    menuRefs,
    menuRefKey,
    row => `${cleanKey(row?.menuName) || '메뉴'} (${menuRefKey(row)})`
  );
  const rawGroups = duplicateGroups(
    rawValues,
    rawValueKey,
    row => `${cleanKey(row?.menuName) || '메뉴'} · ${cleanKey(row?.crustType)}`
  );
  return duplicateSummary(menuGroups, rawGroups);
}
