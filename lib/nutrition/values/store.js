/**
 * lib/nutrition/values/store.js — 영양성분 값 CRUD
 *
 * nutrition_raw_values — 베이스 영양성분 (lab 제공값)
 *   { id, menuCode, menuName, crustType('석쇠L'|'석쇠R'|'씬바사삭L'),
 *     kcal, carbs, sugar, fat, satFat, transFat, cholesterol, protein, sodium, updatedAt }
 *
 * nutrition_edge_master — 엣지 추가값
 *   { id, edgeCode('치즈크러스트L'|'치즈크러스트R'|'골드스윗L'|'골드스윗R'), edgeName,
 *     kcal, carbs, sugar, fat, satFat, transFat, cholesterol, protein, sodium, displayOrder, updatedAt }
 *
 * nutrition_topping_master — 소스/토핑 영양성분
 *   { id, toppingCode, toppingName,
 *     kcal, carbs, sugar, fat, satFat, transFat, cholesterol, protein, sodium, displayOrder, updatedAt }
 *
 * nutrition_menu_ref — 메뉴 목록
 *   { id, menuCode, menuName, category, displayOrder, updatedAt }
 *
 * nutrition_pizza_composition — 파생 메뉴
 *   { id, menuCode, menuName, baseMenuCode, toppingCodes[], displayOrder, updatedAt }
 */

import { getAll, put, deleteById, runTransaction, hasStore } from '@/lib/db';

export const CRUST_TYPES = ['석쇠L', '석쇠R', '씬바사삭L'];
export const EDGE_CODES   = ['치즈크러스트L', '치즈크러스트R', '골드스윗L', '골드스윗R'];
export const EDGE_NAMES   = {
  '치즈크러스트L': '치즈크러스트 L',
  '치즈크러스트R': '치즈크러스트 R',
  '골드스윗L':    '골드스윗 L',
  '골드스윗R':    '골드스윗 R',
};

export const NUTRITION_FIELDS = [
  { key: 'weight',      label: '중량',       unit: 'g'    },
  { key: 'kcal',        label: '열량',       unit: 'kcal' },
  { key: 'carbs',       label: '탄수화물',   unit: 'g'    },
  { key: 'sugar',       label: '당류',       unit: 'g'    },
  { key: 'fat',         label: '지방',       unit: 'g'    },
  { key: 'satFat',      label: '포화지방',   unit: 'g'    },
  { key: 'transFat',    label: '트랜스지방', unit: 'g'    },
  { key: 'cholesterol', label: '콜레스테롤', unit: 'mg'   },
  { key: 'protein',     label: '단백질',     unit: 'g'    },
  { key: 'sodium',      label: '나트륨',     unit: 'mg'   },
];

/**
 * 석쇠 베이스 + 엣지 4종 조합. side: 'L' → 석쇠L, 'R' → 석쇠R
 * calcAllResults 내부에서 두 번 사용하므로 모듈 상수로 추출.
 */
const EDGE_VARIANTS = [
  { crustType: '치즈크러스트L', edgeCode: '치즈크러스트L', side: 'L' },
  { crustType: '치즈크러스트R', edgeCode: '치즈크러스트R', side: 'R' },
  { crustType: '골드스윗L',    edgeCode: '골드스윗L',    side: 'L' },
  { crustType: '골드스윗R',    edgeCode: '골드스윗R',    side: 'R' },
];

const emptyNutrition = () => ({
  weight: '', kcal: '', carbs: '', sugar: '', fat: '', satFat: '',
  transFat: '', cholesterol: '', protein: '', sodium: '',
});

/** displayOrder 오름차순 정렬 비교자 */
const byDisplayOrder = (a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999);

/** updatedAt 타임스탬프를 자동으로 추가하여 put */
function upsertWithTimestamp(storeName, data) {
  return put(storeName, { ...data, updatedAt: new Date().toISOString() });
}

/* ── 메뉴 목록 ─────────────────────────────────── */

export async function getAllMenuRefs() {
  if (!hasStore('nutrition_menu_ref')) return [];
  const rows = await getAll('nutrition_menu_ref');
  return rows.sort(byDisplayOrder);
}

export async function upsertMenuRef(data) {
  return upsertWithTimestamp('nutrition_menu_ref', data);
}

export async function deleteMenuRef(id) {
  return deleteById('nutrition_menu_ref', id);
}

/** 메뉴 삭제 시 연관 raw_values 일괄 삭제 */
export async function deleteRawValuesByMenuCode(menuCode) {
  if (!hasStore('nutrition_raw_values')) return;
  const rows = await getAll('nutrition_raw_values');
  const targets = rows.filter(r => r.menuCode === menuCode);
  if (targets.length === 0) return;
  await runTransaction('nutrition_raw_values', 'readwrite', (tx) => {
    const s = tx.objectStore('nutrition_raw_values');
    targets.forEach(r => s.delete(r.id));
  });
}

/* ── 베이스 영양성분 ────────────────────────────── */

export async function getAllRawValues() {
  if (!hasStore('nutrition_raw_values')) return [];
  return getAll('nutrition_raw_values');
}

/** menuCode × crustType → 영양성분 맵 반환 */
export async function getRawValueMap() {
  const rows = await getAllRawValues();
  const map = {};
  rows.forEach(r => { map[`${r.menuCode}__${r.crustType}`] = r; });
  return map;
}

export async function upsertRawValue(data) {
  return upsertWithTimestamp('nutrition_raw_values', data);
}

export async function deleteRawValue(id) {
  return deleteById('nutrition_raw_values', id);
}

/* ── 엣지 영양성분 ──────────────────────────────── */

export async function getAllEdges() {
  if (!hasStore('nutrition_edge_master')) return [];
  const rows = await getAll('nutrition_edge_master');
  return rows.sort(byDisplayOrder);
}

export async function getEdgeMap() {
  const rows = await getAllEdges();
  const map = {};
  rows.forEach(r => { map[r.edgeCode] = r; });
  return map;
}

export async function upsertEdge(data) {
  return upsertWithTimestamp('nutrition_edge_master', data);
}

/* ── 소스/토핑 ───────────────────────────────────── */

export async function getAllToppings() {
  if (!hasStore('nutrition_topping_master')) return [];
  const rows = await getAll('nutrition_topping_master');
  return rows.sort(byDisplayOrder);
}

export async function upsertTopping(data) {
  return upsertWithTimestamp('nutrition_topping_master', data);
}

export async function deleteTopping(id) {
  return deleteById('nutrition_topping_master', id);
}

/* ── 파생 메뉴 ───────────────────────────────────── */

export async function getAllCompositions() {
  if (!hasStore('nutrition_pizza_composition')) return [];
  const rows = await getAll('nutrition_pizza_composition');
  return rows.sort(byDisplayOrder);
}

export async function upsertComposition(data) {
  return upsertWithTimestamp('nutrition_pizza_composition', data);
}

export async function deleteComposition(id) {
  return deleteById('nutrition_pizza_composition', id);
}

/* ── 계산 로직 ───────────────────────────────────── */

/** 두 영양성분 객체를 더하는 유틸 (순수 함수) */
export function addNutrition(a, b) {
  const result = {};
  NUTRITION_FIELDS.forEach(({ key }) => {
    const va = parseFloat(a?.[key]) || 0;
    const vb = parseFloat(b?.[key]) || 0;
    result[key] = Math.round((va + vb) * 10) / 10;
  });
  return result;
}

/**
 * 메뉴×크러스트 전체 계산 결과 반환 (순수 함수)
 * @returns {Array<{ menuCode, menuName, crustType, ...nutrition }>}
 */
export function calcAllResults({ menus, rawMap, edgeMap, compositions, toppingMap }) {
  const results = [];

  menus.forEach(menu => {
    // 베이스 3종
    CRUST_TYPES.forEach(ct => {
      const base = rawMap[`${menu.menuCode}__${ct}`] || {};
      results.push({ menuCode: menu.menuCode, menuName: menu.menuName, crustType: ct, isDerived: false, ...base });
    });

    // 엣지 4종
    const baseForSide = {
      L: rawMap[`${menu.menuCode}__석쇠L`] || {},
      R: rawMap[`${menu.menuCode}__석쇠R`] || {},
    };
    EDGE_VARIANTS.forEach(({ crustType, edgeCode, side }) => {
      const edge = edgeMap[edgeCode] || {};
      results.push({ menuCode: menu.menuCode, menuName: menu.menuName, crustType, isDerived: false, ...addNutrition(baseForSide[side], edge) });
    });
  });

  // 파생 메뉴
  compositions.forEach(comp => {
    const baseMenu = menus.find(m => m.menuCode === comp.baseMenuCode);
    if (!baseMenu) return;
    const toppings = (comp.toppingCodes || []).map(c => toppingMap[c]).filter(Boolean);
    const toppingSum = toppings.reduce((acc, t) => addNutrition(acc, t), {});

    // 베이스 3종 + 토핑
    CRUST_TYPES.forEach(ct => {
      const base = rawMap[`${comp.baseMenuCode}__${ct}`] || {};
      results.push({ menuCode: comp.menuCode, menuName: comp.menuName, crustType: ct, isDerived: true, baseMenuName: baseMenu.menuName, ...addNutrition(base, toppingSum) });
    });

    // 엣지 4종 + 토핑
    const baseForSide = {
      L: rawMap[`${comp.baseMenuCode}__석쇠L`] || {},
      R: rawMap[`${comp.baseMenuCode}__석쇠R`] || {},
    };
    EDGE_VARIANTS.forEach(({ crustType, edgeCode, side }) => {
      const edge = edgeMap[edgeCode] || {};
      results.push({ menuCode: comp.menuCode, menuName: comp.menuName, crustType, isDerived: true, baseMenuName: baseMenu.menuName, ...addNutrition(addNutrition(baseForSide[side], toppingSum), edge) });
    });
  });

  return results;
}
