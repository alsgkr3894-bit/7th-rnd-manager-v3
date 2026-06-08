/**
 * lib/nutrition/values/store.js — 영양성분 값 CRUD
 *
 * nutrition_raw_values — 베이스 영양성분 (lab 제공값)
 *   { id, menuCode, menuName, crustType('석쇠L'|'석쇠R'|'씬바사삭L'),
 *     kcal, carbs, sugar, fat, satFat, transFat, cholesterol, protein, sodium, updatedAt }
 *
 * nutrition_ingredient_values — 식자재별 100g 기준 영양성분 (자동계산용)
 *   { id, productCode, ingredientName,
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

import { getAll, getByIndex, put, deleteById, runTransaction, hasStore } from '@/lib/db';
import {
  CRUST_TYPES as _CRUST_TYPES,
  EDGE_CODES  as _EDGE_CODES,
  EDGE_NAMES  as _EDGE_NAMES,
  EDGE_VARIANTS as _EDGE_VARIANTS,
  SIDE_BASE_CRUST,
} from '@/lib/nutrition/crust-config';

// 기존 import 경로(TabBase·TabEdge 등)를 바꾸지 않아도 되도록 re-export
export const CRUST_TYPES = _CRUST_TYPES;
export const EDGE_CODES  = _EDGE_CODES;
export const EDGE_NAMES  = _EDGE_NAMES;

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

// crust-config에서 import한 EDGE_VARIANTS를 그대로 사용 (로컬 복사본 제거)
const EDGE_VARIANTS = _EDGE_VARIANTS;

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

/**
 * nutrition_menu_ref 단건 삭제 + cascade:
 *   - nutrition_allergy_links (menuCode 인덱스 사용)
 *   - nutrition_raw_values (deleteRawValuesByMenuCode 위임)
 *
 * @param {number} id       - nutrition_menu_ref.id
 * @param {string} [menuCode] - 연관 링크 cascade용 (있을 때만 삭제)
 */
export async function deleteMenuRef(id, menuCode) {
  await deleteById('nutrition_menu_ref', id);
  if (menuCode) {
    await deleteRawValuesByMenuCode(menuCode);
    if (hasStore('nutrition_allergy_links')) {
      const links = await getByIndex('nutrition_allergy_links', 'menuCode', menuCode);
      for (const l of links) await deleteById('nutrition_allergy_links', l.id);
    }
  }
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

/** nutrition_menu_ref + nutrition_raw_values 전체 삭제 */
export async function clearAllBaseData() {
  for (const storeName of ['nutrition_raw_values', 'nutrition_menu_ref']) {
    if (!hasStore(storeName)) continue;
    await runTransaction(storeName, 'readwrite', tx => {
      tx.objectStore(storeName).clear();
    });
  }
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

/* ── 세트 구성 ───────────────────────────────────── */

export async function getAllSetCompositions() {
  if (!hasStore('nutrition_set_composition')) return [];
  const rows = await getAll('nutrition_set_composition');
  return rows.sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''));
}

export async function upsertSetComposition(data) {
  return upsertWithTimestamp('nutrition_set_composition', data);
}

export async function deleteSetComposition(id) {
  return deleteById('nutrition_set_composition', id);
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
 *
 * @param {object} opts
 * @param {Array}  opts.menus
 * @param {object} opts.rawMap
 * @param {object} opts.edgeMap
 * @param {Array}  opts.compositions
 * @param {object} opts.toppingMap
 * @param {object} [opts.masterByCode] - menuCode → master 레코드. 제공 시 피자만 엣지 행 추가.
 * @returns {Array<{ menuCode, menuName, crustType, ...nutrition }>}
 */
export function calcAllResults({ menus, rawMap, edgeMap, compositions, toppingMap, masterByCode }) {
  const results = [];

  menus.forEach(menu => {
    const isPizza = _isPizzaMenu(menu, masterByCode);

    // 베이스 3종
    CRUST_TYPES.forEach(ct => {
      const base = rawMap[`${menu.menuCode}__${ct}`] || {};
      results.push({ menuCode: menu.menuCode, menuName: menu.menuName, crustType: ct, isDerived: false, ...base });
    });

    // 엣지 4종 — 피자 전용 (masterByCode 미제공 시 기존 동작 유지)
    if (isPizza) {
      const baseForSide = {
        L: rawMap[`${menu.menuCode}__${SIDE_BASE_CRUST.L}`] || {},
        R: rawMap[`${menu.menuCode}__${SIDE_BASE_CRUST.R}`] || {},
      };
      EDGE_VARIANTS.forEach(({ crustType, edgeCode, side }) => {
        const edge = edgeMap[edgeCode] || {};
        results.push({ menuCode: menu.menuCode, menuName: menu.menuName, crustType, isDerived: false, ...addNutrition(baseForSide[side], edge) });
      });
    }
  });

  // 파생 메뉴
  compositions.forEach(comp => {
    const baseMenu = menus.find(m => m.menuCode === comp.baseMenuCode);
    if (!baseMenu) return;
    const isPizza = _isPizzaMenu(baseMenu, masterByCode);
    const toppings = (comp.toppingCodes || []).map(c => toppingMap[c]).filter(Boolean);
    const toppingSum = toppings.reduce((acc, t) => addNutrition(acc, t), {});

    // 베이스 3종 + 토핑
    CRUST_TYPES.forEach(ct => {
      const base = rawMap[`${comp.baseMenuCode}__${ct}`] || {};
      results.push({ menuCode: comp.menuCode, menuName: comp.menuName, crustType: ct, isDerived: true, baseMenuName: baseMenu.menuName, ...addNutrition(base, toppingSum) });
    });

    // 엣지 4종 + 토핑 — 피자 전용
    if (isPizza) {
      const baseForSide = {
        L: rawMap[`${comp.baseMenuCode}__${SIDE_BASE_CRUST.L}`] || {},
        R: rawMap[`${comp.baseMenuCode}__${SIDE_BASE_CRUST.R}`] || {},
      };
      EDGE_VARIANTS.forEach(({ crustType, edgeCode, side }) => {
        const edge = edgeMap[edgeCode] || {};
        results.push({ menuCode: comp.menuCode, menuName: comp.menuName, crustType, isDerived: true, baseMenuName: baseMenu.menuName, ...addNutrition(addNutrition(baseForSide[side], toppingSum), edge) });
      });
    }
  });

  return results;
}

/** @private masterByCode 미제공 시 모두 피자로 간주 (하위 호환) */
function _isPizzaMenu(menu, masterByCode) {
  if (!masterByCode) return true;
  const cat = masterByCode[menu.menuCode]?.category || menu.category || '';
  if (cat.includes('음료') || cat.includes('사이드') || cat.includes('파스타') ||
      cat.includes('추가토핑') || cat === '소스' || cat.includes('세트') || cat.includes('하프앤하프')) {
    return false;
  }
  return true; // 피자, 1인피자, 기타 포함
}

/* ── 식자재별 영양값 (100g 기준 자동계산용) ────────────── */

export async function getAllIngredientValues() {
  if (!hasStore('nutrition_ingredient_values')) return [];
  return getAll('nutrition_ingredient_values');
}

/** productCode → 영양값 객체 맵 반환 */
export async function getIngredientValuesMap() {
  const rows = await getAllIngredientValues();
  const map = {};
  rows.forEach(r => { if (r.productCode) map[r.productCode] = r; });
  return map;
}

export async function upsertIngredientValue(data) {
  return upsertWithTimestamp('nutrition_ingredient_values', data);
}

export async function deleteIngredientValueByCode(productCode) {
  if (!hasStore('nutrition_ingredient_values') || !productCode) return;
  const rows = await getAll('nutrition_ingredient_values');
  const target = rows.find(r => r.productCode === productCode);
  if (target) await deleteById('nutrition_ingredient_values', target.id);
}
