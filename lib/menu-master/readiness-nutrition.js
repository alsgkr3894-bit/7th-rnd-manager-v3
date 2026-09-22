/**
 * lib/menu-master/readiness-nutrition.js — 메뉴 영양성분 연동 판정
 *
 * readiness.js에서 분리(파일 크기 관리): nutrition_raw_values·nutrition_topping_master·
 * nutrition_edge_master 기반 "영양 연동" 판정만 모아둔다. 엣지(카테고리 '엣지') 행은
 * menuCode가 아니라 edge-family.js의 패밀리 단위로 연동 여부가 정해진다 — 치즈크러스트·
 * 골드스윗은 nutrition_edge_master의 L/R 코드가 모두 있어야, 석쇠·씬바사삭은 베이스
 * crustType(nutrition_raw_values)이 어느 피자 메뉴에서든 하나라도 입력돼 있으면 연동이다.
 */
import { hasStore } from '@/lib/db';
import { getAllRawValues } from '@/lib/nutrition/values/raw-values';
import {
  getAllToppings,
  getAllEdges as getAllNutritionEdges,
  toppingNameMatchKey,
} from '@/lib/nutrition/values/store';
import { resolveMenuEdgeFamily, EDGE_FAMILIES } from './edge-family';
import { buildOutputAliasMap } from './output-alias';
import { getAllMenuMaster } from './store';
import { asObjectArray } from '@/lib/ui/prop-guards';

async function loadOptional(storeName, loader) {
  if (!hasStore(storeName)) return [];
  return loader().catch(() => []);
}

// nutrition_raw_values는 L/R 사이즈를 합친 base 코드로 저장된다(lib/nutrition/
// values/import.js 참고). 메뉴마스터의 menuCode는 사이즈 접미사가 붙은 full
// 코드라, 그대로 비교하면 사이즈 있는 메뉴는 전부 "영양 누락"으로 오탐한다.
function stripSizeSuffix(code) {
  return String(code || '').replace(/-(?:L|R)$/i, '');
}

/** 영양성분 (nutrition_raw_values에 menuCode 또는 그 base 코드가 있으면 ok) */
export function checkNutrition(menuCode, rawValueMenuCodes) {
  if (!rawValueMenuCodes.has(menuCode) && !rawValueMenuCodes.has(stripSizeSuffix(menuCode))) {
    return { status: 'missing', detail: '영양성분 값 미입력' };
  }
  return { status: 'ok' };
}

/**
 * 엣지 패밀리(석쇠·치즈크러스트·골드스윗·씬바사삭)별 영양 연동 여부.
 */
export function computeEdgeNutritionLinkedFamilyKeys(rawValues, nutritionEdges) {
  const rawCrustTypes = new Set(
    asObjectArray(rawValues)
      .map(r => r.crustType)
      .filter(Boolean)
  );
  const nutritionEdgeCodes = new Set(
    asObjectArray(nutritionEdges)
      .map(e => e.edgeCode)
      .filter(Boolean)
  );
  return new Set(
    EDGE_FAMILIES.filter(family => {
      if (family.nutritionEdgeCodes.length > 0) {
        return family.nutritionEdgeCodes.every(code => nutritionEdgeCodes.has(code));
      }
      if (family.baseCrustTypes.length > 0) {
        return family.baseCrustTypes.some(ct => rawCrustTypes.has(ct));
      }
      return false;
    }).map(family => family.key)
  );
}

/**
 * 메뉴마스터 목록 화면(행 단위 칩)에서 쓰기 위한 가벼운 영양성분 연동 판정.
 * buildMenuReadinessMap은 원산지·알레르기 커버리지까지 함께 계산해 무거워서
 * (출시 준비/품질 점검 탭 전환 시에만 돈다) 목록 탭에서 매번 돌리기엔 부담스럽다 —
 * nutrition_raw_values + nutrition_topping_master + nutrition_edge_master만 로드해
 * checkNutrition과 같은 규칙(base 코드 매칭)에 추가토핑 이름 매칭·엣지 패밀리 매칭까지
 * 더해 판정한다.
 *
 * 추가토핑(menu_master의 T-* 메뉴)은 실제 출력 시 nutrition_topping_master를 코드(있으면
 * 우선) 또는 이름으로 매칭한다(lib/nutrition/label/menu-preview.js와 같은 규칙) — 코드
 * 매칭만 보면 토핑마스터에 값이 있는 메뉴도 "누락"으로 잘못 표시된다.
 */
/**
 * buildNutritionLinkedMenuCodeSet()의 순수 계산부 — rawValues·toppings·nutritionEdges를
 * 이미 다른 곳에서 로드해 둔 호출자(예: buildMenuReadinessMap)가 중복 조회 없이 재사용할
 * 수 있도록 분리했다.
 */
export function buildNutritionLinkedMenuCodeSetFrom({
  rawValues,
  toppings,
  nutritionEdges,
  menuMasters = [],
}) {
  const safeToppings = asObjectArray(toppings);
  const codes = [
    ...asObjectArray(rawValues)
      .map(r => r.menuCode)
      .filter(Boolean),
    // 사용자가 토핑 편집 화면에서 직접 연결한 메뉴마스터 코드 — 있으면 이름이 달라도 정확히 잡힌다.
    ...safeToppings.map(t => String(t.menuCode || '').trim()).filter(Boolean),
  ];
  // 코드를 아직 안 넣은 토핑은 이름으로 폴백한다. 토핑명은 메뉴마스터와 별개 화면에서
  // 입력돼 공백 위치·대소문자만 다른 경우가 흔하다(예: "페페로니 12장 (29g)" vs
  // "페페로니12장(29g)") — 정규화한 키로 저장해 둔다.
  const toppingNameKeys = safeToppings.map(t => toppingNameMatchKey(t.toppingName)).filter(Boolean);
  // 엣지(메뉴마스터 카테고리 '엣지')는 menuCode가 아니라 패밀리 단위로 연동 여부가 정해진다
  // (nutrition_edge_master/raw_values crustType) — 'edge:<family key>' 센티널로 함께 넣는다.
  const edgeFamilyKeys = [...computeEdgeNutritionLinkedFamilyKeys(rawValues, nutritionEdges)].map(
    key => `edge:${key}`
  );
  const linked = new Set([...codes, ...toppingNameKeys, ...edgeFamilyKeys]);
  // 출력 대표 메뉴 연결(outputMenuCode): 변형이나 대표 어느 한쪽에 값이 있으면 둘 다 연동으로 본다
  // — 출력은 대표 한 행으로 합쳐 나가므로(label/context.js) 실제 출력과 같은 판정이다.
  const aliasMap = buildOutputAliasMap(menuMasters);
  for (const [variant, rep] of aliasMap) {
    const variantLinked = linked.has(variant) || linked.has(stripSizeSuffix(variant));
    const repLinked = linked.has(rep.menuCode) || linked.has(stripSizeSuffix(rep.menuCode));
    if (variantLinked) linked.add(rep.menuCode);
    if (repLinked) linked.add(variant);
  }
  return linked;
}

export async function buildNutritionLinkedMenuCodeSet() {
  const [rawValues, toppings, nutritionEdges, menuMasters] = await Promise.all([
    loadOptional('nutrition_raw_values', getAllRawValues),
    loadOptional('nutrition_topping_master', getAllToppings),
    loadOptional('nutrition_edge_master', getAllNutritionEdges),
    loadOptional('menu_master', getAllMenuMaster),
  ]);
  return buildNutritionLinkedMenuCodeSetFrom({ rawValues, toppings, nutritionEdges, menuMasters });
}

export function isMenuNutritionLinked(menu, linkedSet) {
  if (checkNutrition(menu?.menuCode, linkedSet).status === 'ok') return true;
  if (menu?.menuName && linkedSet.has(toppingNameMatchKey(menu.menuName))) return true;
  const family = resolveMenuEdgeFamily(menu);
  return Boolean(family && linkedSet.has(`edge:${family.key}`));
}
