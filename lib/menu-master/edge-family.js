/**
 * lib/menu-master/edge-family.js — 엣지(크러스트) 패밀리 단일 출처
 *
 * 엣지가 세 곳에 서로 다른 코드 체계로 따로 존재한다:
 *   - menu_master(OPT-EDGE-*, category '엣지') — 메뉴마스터 카탈로그·판매가 1건
 *   - cost_edge_dough(edgeType+size)           — 공통 원가 관리 → 엣지 관리, 사이즈별 구성품 원가
 *   - nutrition_edge_master(edgeCode) / nutrition_raw_values(crustType) — 영양성분
 *
 * 이 파일은 그 셋을 "패밀리 키"(석쇠·치즈크러스트·골드스윗·씬바사삭) 하나로 잇는다.
 * cost·nutrition 쪽 매핑은 새로 만들지 않고 lib/nutrition/crust-config.js의
 * ALLERGEN_CRUST_VARIANTS·EDGE_CODES·CRUST_TYPES에서 그대로 가져온다 — 4번째 복사본 금지.
 */
import {
  ALLERGEN_CRUST_VARIANTS,
  EDGE_CODES,
  CRUST_TYPES,
  THIN_CRUST_KEY,
} from '@/lib/nutrition/crust-config';

// cost의 edgeType('골드스윗크러스트')과 nutrition의 edgeCode 접두('골드스윗')는 의도적으로
// 다른 표기다(crust-config.js 상단 설명 참고) — 여기서만 쓰는 최소 번역표.
const NUTRITION_EDGE_PREFIX = { 치즈크러스트: '치즈크러스트', 골드스윗크러스트: '골드스윗' };

function nameKey(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** 엣지 패밀리 4종. ALLERGEN_CRUST_VARIANTS 순서(석쇠·씬바사삭·치즈크러스트·골드스윗) 그대로. */
export const EDGE_FAMILIES = ALLERGEN_CRUST_VARIANTS.map(v => {
  const nutritionPrefix = v.edgeType ? NUTRITION_EDGE_PREFIX[v.edgeType] : null;
  return {
    key: v.key,
    label: v.label,
    // cost_edge_dough.edgeType — null이면(석쇠) 추가 구성품/추가 원가가 없는 기본 도우.
    costEdgeType: v.edgeType,
    // nutrition_edge_master.edgeCode 2종(L/R) — 치즈크러스트·골드스윗만 해당.
    nutritionEdgeCodes: nutritionPrefix
      ? EDGE_CODES.filter(code => code.startsWith(nutritionPrefix))
      : [],
    // nutrition_raw_values.crustType — 석쇠·씬바사삭은 엣지가 아니라 베이스 크러스트로 저장된다.
    baseCrustTypes: CRUST_TYPES.filter(code => code.startsWith(v.key)),
  };
});

const FAMILY_BY_KEY = new Map(EDGE_FAMILIES.map(f => [f.key, f]));

export function getEdgeFamily(key) {
  return FAMILY_BY_KEY.get(key) || null;
}

/**
 * menu_master 엣지 행 또는 cost_selling_prices 엣지 행(둘 다 category/menuName/edgeKey 필드
 * 모양이 같다)에서 패밀리를 판정한다. 명시적으로 저장된 edgeKey를 우선하고, 없으면 메뉴명에서
 * 공백 무시 부분일치로 자동 판정한다(오늘 추가토핑에 적용한 것과 같은 이름 폴백 방식).
 *
 * @param {{ category?: string, menuName?: string, edgeKey?: string }} row
 * @returns {{ key:string, label:string, costEdgeType:string|null, nutritionEdgeCodes:string[], baseCrustTypes:string[] } | null}
 */
export function resolveMenuEdgeFamily(row) {
  if (!row || String(row.category || '').trim() !== '엣지') return null;
  if (row.edgeKey) {
    const explicit = getEdgeFamily(row.edgeKey);
    if (explicit) return explicit;
  }
  const key = nameKey(row.menuName);
  if (!key) return null;
  if (key.includes(nameKey('치즈'))) return getEdgeFamily('치즈크러스트');
  if (key.includes(nameKey('골드'))) return getEdgeFamily('골드스윗');
  if (key.includes(nameKey(THIN_CRUST_KEY)) || key.includes('씬'))
    return getEdgeFamily(THIN_CRUST_KEY);
  if (key.includes('석쇠')) return getEdgeFamily('석쇠');
  return null;
}
