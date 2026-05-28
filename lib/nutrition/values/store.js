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
  { key: 'kcal',        label: '열량',     unit: 'kcal' },
  { key: 'carbs',       label: '탄수화물', unit: 'g'    },
  { key: 'sugar',       label: '당류',     unit: 'g'    },
  { key: 'fat',         label: '지방',     unit: 'g'    },
  { key: 'satFat',      label: '포화지방', unit: 'g'    },
  { key: 'transFat',    label: '트랜스지방', unit: 'g'  },
  { key: 'cholesterol', label: '콜레스테롤', unit: 'mg' },
  { key: 'protein',     label: '단백질',   unit: 'g'    },
  { key: 'sodium',      label: '나트륨',   unit: 'mg'   },
];

const emptyNutrition = () => ({
  kcal: '', carbs: '', sugar: '', fat: '', satFat: '',
  transFat: '', cholesterol: '', protein: '', sodium: '',
});

/* ── 메뉴 목록 ─────────────────────────────────── */

export async function getAllMenuRefs() {
  if (!hasStore('nutrition_menu_ref')) return [];
  const rows = await getAll('nutrition_menu_ref');
  return rows.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
}

export async function upsertMenuRef(data) {
  return await put('nutrition_menu_ref', { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteMenuRef(id) {
  return await deleteById('nutrition_menu_ref', id);
}

/* ── 베이스 영양성분 ────────────────────────────── */

export async function getAllRawValues() {
  if (!hasStore('nutrition_raw_values')) return [];
  return await getAll('nutrition_raw_values');
}

/** menuCode × crustType → 영양성분 맵 반환 */
export async function getRawValueMap() {
  const rows = await getAllRawValues();
  const map = {};
  rows.forEach(r => {
    const key = `${r.menuCode}__${r.crustType}`;
    map[key] = r;
  });
  return map;
}

export async function upsertRawValue(data) {
  return await put('nutrition_raw_values', { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteRawValue(id) {
  return await deleteById('nutrition_raw_values', id);
}

/* ── 엣지 영양성분 ──────────────────────────────── */

export async function getAllEdges() {
  if (!hasStore('nutrition_edge_master')) return [];
  const rows = await getAll('nutrition_edge_master');
  return rows.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
}

export async function getEdgeMap() {
  const rows = await getAllEdges();
  const map = {};
  rows.forEach(r => { map[r.edgeCode] = r; });
  return map;
}

export async function upsertEdge(data) {
  return await put('nutrition_edge_master', { ...data, updatedAt: new Date().toISOString() });
}

export async function seedEdges() {
  if (!hasStore('nutrition_edge_master')) return;
  const existing = await getAll('nutrition_edge_master');
  if (existing.length > 0) return;
  const now = new Date().toISOString();
  await runTransaction('nutrition_edge_master', 'readwrite', (tx) => {
    const s = tx.objectStore('nutrition_edge_master');
    EDGE_CODES.forEach((code, i) => {
      s.put({ edgeCode: code, edgeName: EDGE_NAMES[code], displayOrder: i + 1, ...emptyNutrition(), updatedAt: now });
    });
  });
}

/* ── 소스/토핑 ───────────────────────────────────── */

export async function getAllToppings() {
  if (!hasStore('nutrition_topping_master')) return [];
  const rows = await getAll('nutrition_topping_master');
  return rows.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
}

export async function upsertTopping(data) {
  return await put('nutrition_topping_master', { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteTopping(id) {
  return await deleteById('nutrition_topping_master', id);
}

/* ── 파생 메뉴 ───────────────────────────────────── */

export async function getAllCompositions() {
  if (!hasStore('nutrition_pizza_composition')) return [];
  const rows = await getAll('nutrition_pizza_composition');
  return rows.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
}

export async function upsertComposition(data) {
  return await put('nutrition_pizza_composition', { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteComposition(id) {
  return await deleteById('nutrition_pizza_composition', id);
}

/* ── 계산 로직 ───────────────────────────────────── */

/** 두 영양성분 객체를 더하는 유틸 */
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
 * 메뉴×크러스트 전체 계산 결과 반환
 * returns: [{ menuCode, menuName, crustType, ...nutrition }]
 */
export function calcAllResults({ menus, rawMap, edgeMap, compositions, toppingMap }) {
  const results = [];

  menus.forEach(menu => {
    // 베이스 3종
    CRUST_TYPES.forEach(ct => {
      const base = rawMap[`${menu.menuCode}__${ct}`] || {};
      results.push({ menuCode: menu.menuCode, menuName: menu.menuName, crustType: ct, isDerived: false, ...base });
    });

    // 엣지 4종 (석쇠L → 치즈크러스트L/R, 골드스윗L/R)
    const baseL = rawMap[`${menu.menuCode}__석쇠L`] || {};
    const baseR = rawMap[`${menu.menuCode}__석쇠R`] || {};
    [
      { ct: '치즈크러스트L', base: baseL, edgeCode: '치즈크러스트L' },
      { ct: '치즈크러스트R', base: baseR, edgeCode: '치즈크러스트R' },
      { ct: '골드스윗L',    base: baseL, edgeCode: '골드스윗L'    },
      { ct: '골드스윗R',    base: baseR, edgeCode: '골드스윗R'    },
    ].forEach(({ ct, base, edgeCode }) => {
      const edge = edgeMap[edgeCode] || {};
      results.push({ menuCode: menu.menuCode, menuName: menu.menuName, crustType: ct, isDerived: false, ...addNutrition(base, edge) });
    });
  });

  // 파생 메뉴
  compositions.forEach(comp => {
    const baseMenu = menus.find(m => m.menuCode === comp.baseMenuCode);
    if (!baseMenu) return;
    const toppings = (comp.toppingCodes || []).map(c => toppingMap[c]).filter(Boolean);
    const toppingSum = toppings.reduce((acc, t) => addNutrition(acc, t), {});

    CRUST_TYPES.forEach(ct => {
      const base = rawMap[`${comp.baseMenuCode}__${ct}`] || {};
      results.push({ menuCode: comp.menuCode, menuName: comp.menuName, crustType: ct, isDerived: true, baseMenuName: baseMenu.menuName, ...addNutrition(base, toppingSum) });
    });

    const baseL = rawMap[`${comp.baseMenuCode}__석쇠L`] || {};
    const baseR = rawMap[`${comp.baseMenuCode}__석쇠R`] || {};
    [
      { ct: '치즈크러스트L', base: baseL, edgeCode: '치즈크러스트L' },
      { ct: '치즈크러스트R', base: baseR, edgeCode: '치즈크러스트R' },
      { ct: '골드스윗L',    base: baseL, edgeCode: '골드스윗L'    },
      { ct: '골드스윗R',    base: baseR, edgeCode: '골드스윗R'    },
    ].forEach(({ ct, base, edgeCode }) => {
      const edge = edgeMap[edgeCode] || {};
      results.push({ menuCode: comp.menuCode, menuName: comp.menuName, crustType: ct, isDerived: true, baseMenuName: baseMenu.menuName, ...addNutrition(addNutrition(base, toppingSum), edge) });
    });
  });

  return results;
}
