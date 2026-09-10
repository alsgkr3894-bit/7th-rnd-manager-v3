import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

function menuCodeOf(row) {
  return asDisplayText(row?.menuCode).trim();
}

function normalizeCodeKey(code) {
  return asDisplayText(code).trim().toUpperCase();
}

// 사이즈 접미사를 코드 문자열 자체에서 정규식으로 벗겨낸다 — 메뉴마스터 행의
// size 칼럼 값에 의존하는 getMenuCodeBase()는 size가 비어있거나 표기가
// 다르면(예: '라지') 벗겨내지 못해 정상 메뉴를 "메뉴마스터에 없음"으로 오탐했다.
// lib/nutrition/values/import.js의 codeCandidates()와 동일한 패턴 — 그쪽은 이미
// 이 방식으로 안정적으로 동작 중이라 여기도 같은 규칙으로 맞춘다.
function stripSizeSuffix(code) {
  return code.replace(/-(?:L|R)$/i, '');
}

function addCode(codes, code) {
  const key = normalizeCodeKey(code);
  if (key) codes.add(key);
}

function buildMasterCodeSet(menuMasters) {
  const codes = new Set();
  for (const menu of asObjectArray(menuMasters)) {
    const fullCode = menuCodeOf(menu);
    addCode(codes, fullCode);
    addCode(codes, stripSizeSuffix(normalizeCodeKey(fullCode)));
  }
  return codes;
}

/**
 * 영양성분(base 코드) 하나에 L/R 등 여러 사이즈 메뉴마스터 행이 묶여 있을 수
 * 있다. "이 base 코드에 연결된 메뉴마스터 행이 전부 단종"일 때만 숨김 대상으로
 * 판정한다 — 하나라도 판매 중이면 영양성분은 계속 보여야 한다(사용자 결정).
 * @param {Array} menuMasters
 * @returns {Set<string>} 정규화(대문자)된 base 코드 집합
 */
export function buildDiscontinuedBaseCodeSet(menuMasters) {
  const byBase = new Map();
  for (const menu of asObjectArray(menuMasters)) {
    const fullCode = menuCodeOf(menu);
    if (!fullCode) continue;
    const base = stripSizeSuffix(normalizeCodeKey(fullCode));
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(menu?.status);
  }
  const discontinued = new Set();
  for (const [base, statuses] of byBase) {
    if (statuses.length > 0 && statuses.every(status => status === 'discontinued')) {
      discontinued.add(base);
    }
  }
  return discontinued;
}

/** 주어진 영양성분 menuCode(base)가 위 집합에 있는지(정규화 후 비교). */
export function isNutritionMenuDiscontinued(menuCode, discontinuedBaseCodeSet) {
  if (!discontinuedBaseCodeSet || discontinuedBaseCodeSet.size === 0) return false;
  const base = stripSizeSuffix(normalizeCodeKey(menuCodeOf({ menuCode })));
  return discontinuedBaseCodeSet.has(base);
}

export function buildNutritionMenuMasterDiagnostics({ menuRefs = [], menuMasters = [] } = {}) {
  const masterCodes = buildMasterCodeSet(menuMasters);
  const orphanMenuRefs = asObjectArray(menuRefs)
    .filter(row => {
      const menuCode = menuCodeOf(row);
      return menuCode && !masterCodes.has(normalizeCodeKey(menuCode));
    })
    .map(row => ({
      id: row.id ?? null,
      menuCode: menuCodeOf(row),
      menuName: asDisplayText(row.menuName, row.menuCode),
    }));

  return {
    orphanMenuRefs,
    orphanCount: orphanMenuRefs.length,
    hasOrphans: orphanMenuRefs.length > 0,
  };
}
