/**
 * lib/nutrition/label/build.js — 영양성분표 출력 데이터 빌더 (순수 함수)
 *
 * 시트1 피자           : 메뉴별 크러스트/엣지 행 (150g 기준)
 * 시트2 추가토핑       : 1회중량(weight 필드) 기준
 * 시트3 사이드·파스타  : 1회중량(weight 필드) 기준
 * 시트4 세트박스·하프앤하프: 최소/최대 열량 (세트 계산 결과)
 * 시트5 음료           : 총용량(parseVolumeMl) 기준
 *
 * 모든 rawMap 값은 100g 기준 저장 → scaleVal()로 환산.
 */

import { CRUST_TYPES, addNutrition } from '@/lib/nutrition/values/store';
import { EDGE_VARIANTS, SIDE_BASE_CRUST } from '@/lib/nutrition/crust-config';
import { calcSetMinMax, calcHalfMinMax } from '@/lib/nutrition/values/set-calc';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import { allergenNames } from '@/lib/nutrition/allergen/aggregate';

/** 레이블 출력 컬럼 정의 */
export const LABEL_COLS = [
  { key: 'weight',  label: '1회중량', unit: 'g' },
  { key: 'kcal',    label: '열량',    unit: 'kcal' },
  { key: 'sugar',   label: '당류',    unit: 'g' },
  { key: 'protein', label: '단백질',  unit: 'g' },
  { key: 'satFat',  label: '포화지방', unit: 'g' },
  { key: 'sodium',  label: '나트륨',  unit: 'mg' },
];

/** 100g 기준값 → grams 기준으로 환산 (소수 1자리) */
export function scaleVal(per100, grams) {
  if (per100 === '' || per100 == null || per100 === undefined) return '';
  const v = parseFloat(per100);
  if (isNaN(v)) return '';
  return Math.round((v * grams / 100) * 10) / 10;
}

/**
 * 메뉴명 또는 코드에서 용량(ml) 파싱.
 * 1.5L → 1500, 355ml → 355, 1.25l → 1250
 */
export function parseVolumeMl(name, code) {
  const s = `${name || ''} ${code || ''}`;
  const mL = s.match(/(\d+(?:\.\d+)?)\s*[Ll](?:\b|$)/);
  if (mL) return Math.round(parseFloat(mL[1]) * 1000);
  const ml = s.match(/(\d+(?:\.\d+)?)\s*ml/i);
  if (ml) return Math.round(parseFloat(ml[1]));
  return null;
}

/** LABEL_COLS에 대해 scale된 객체 반환 */
function scaledCols(raw100, grams) {
  const res = {};
  LABEL_COLS.forEach(({ key }) => {
    if (key === 'weight') { res.weight = grams; return; }
    res[key] = scaleVal(raw100[key], grams);
  });
  return res;
}

/** 1인피자 여부 판별 (category === '1인피자') */
function isPersonalPizza(menu, masterByCode) {
  const cat = masterByCode[menu.menuCode]?.category || menu.category || '';
  return cat === '1인피자';
}

/* ── 시트 빌더 ──────────────────────────────────────────────── */

/**
 * 피자 시트 빌더
 * @returns {Array<{ menuName, rows:[{ crustLabel, side, ...scaledCols, allergen }] }>}
 */
export function buildPizzaSheet({ menus, rawMap, edgeMap, masterByCode, menuAllergenMap }) {
  return menus
    .filter(m => resolveNutritionGroup(m, masterByCode) === '피자')
    .map(menu => {
      const personal = isPersonalPizza(menu, masterByCode);
      const allergen = allergenNames(menuAllergenMap?.get(menu.menuCode));
      const rows = [];

      if (personal) {
        // 1인피자: 씬바사삭L 행만
        const raw = rawMap[`${menu.menuCode}__씬바사삭L`] || {};
        rows.push({
          crustLabel: '씬바사삭', side: 'L',
          ...scaledCols(raw, 150),
          allergen,
        });
      } else {
        // 베이스 3종 → 2행(L/R) 체계
        const crustRows = [
          { crustLabel: '석쇠',    crustKey: '석쇠L',    side: 'L' },
          { crustLabel: '석쇠',    crustKey: '석쇠R',    side: 'R' },
          { crustLabel: '씬바사삭', crustKey: '씬바사삭L', side: 'L' },
          ];
        crustRows.forEach(({ crustLabel, crustKey, side }) => {
          const raw = rawMap[`${menu.menuCode}__${crustKey}`] || {};
          rows.push({ crustLabel, side, ...scaledCols(raw, 150), allergen });
        });

        // 엣지 4종
        const edgeDefs = [
          { crustLabel: '치즈크러스트', side: 'L', edgeCode: '치즈크러스트L', baseCrust: '석쇠L' },
          { crustLabel: '치즈크러스트', side: 'R', edgeCode: '치즈크러스트R', baseCrust: '석쇠R' },
          { crustLabel: '골드스윗',    side: 'L', edgeCode: '골드스윗L',    baseCrust: '석쇠L' },
          { crustLabel: '골드스윗',    side: 'R', edgeCode: '골드스윗R',    baseCrust: '석쇠R' },
        ];
        edgeDefs.forEach(({ crustLabel, side, edgeCode, baseCrust }) => {
          const base = rawMap[`${menu.menuCode}__${baseCrust}`] || {};
          const edge = edgeMap[edgeCode] || {};
          const combined = addNutrition(base, edge);
          rows.push({ crustLabel, side, ...scaledCols(combined, 150), allergen });
        });
      }

      return { menuName: menu.menuName, menuCode: menu.menuCode, rows };
    });
}

/**
 * 추가토핑 시트 빌더 (1회중량 = weight 필드 기준)
 */
export function buildToppingSheet({ menus, rawMap, masterByCode, menuAllergenMap }) {
  return menus
    .filter(m => resolveNutritionGroup(m, masterByCode) === '추가토핑')
    .map(menu => {
      const raw = rawMap[`${menu.menuCode}__석쇠L`] || rawMap[`${menu.menuCode}__씬바사삭L`] || {};
      const weight = parseFloat(raw.weight) || null;
      const allergen = allergenNames(menuAllergenMap?.get(menu.menuCode));
      return {
        menuName: menu.menuName,
        menuCode: menu.menuCode,
        weight: weight ?? '—',
        ...Object.fromEntries(
          LABEL_COLS.filter(c => c.key !== 'weight').map(({ key }) => [
            key, weight ? scaleVal(raw[key], weight) : '—',
          ])
        ),
        allergen,
      };
    });
}

/**
 * 사이드·파스타 시트 빌더
 */
export function buildSideSheet({ menus, rawMap, masterByCode, menuAllergenMap }) {
  return menus
    .filter(m => resolveNutritionGroup(m, masterByCode) === '사이드')
    .map(menu => {
      const raw = rawMap[`${menu.menuCode}__석쇠L`] || rawMap[`${menu.menuCode}__씬바사삭L`] || {};
      const weight = parseFloat(raw.weight) || null;
      const allergen = allergenNames(menuAllergenMap?.get(menu.menuCode));
      return {
        menuName: menu.menuName,
        menuCode: menu.menuCode,
        weight: weight ?? '—',
        ...Object.fromEntries(
          LABEL_COLS.filter(c => c.key !== 'weight').map(({ key }) => [
            key, weight ? scaleVal(raw[key], weight) : '—',
          ])
        ),
        allergen,
      };
    });
}

/**
 * 세트박스·하프앤하프 시트 빌더
 * @param {Array} setComps - nutrition_set_composition 목록
 */
export function buildSetHalfSheet({ menus, rawMap, edgeMap, masterByCode, menuAllergenMap, setComps }) {
  const pizzaMenus = menus.filter(m => resolveNutritionGroup(m, masterByCode) === '피자');
  const halfResult = calcHalfMinMax(pizzaMenus, rawMap, edgeMap || {});

  const rows = [];

  // 하프앤하프 행 (자동) — 1회중량 = 최소조합 두 반쪽 합계
  rows.push({
    kind: 'half',
    menuName: '하프앤하프',
    weight: halfResult.minWeight ?? '—',
    minKcal: halfResult.minKcal ?? '—',
    maxKcal: halfResult.maxKcal ?? '—',
    allergen: '',
  });

  // 저장된 세트박스
  (setComps || []).filter(c => c.kind === 'set').forEach(comp => {
    const result = calcSetMinMax(comp.slots || [], menus, rawMap, masterByCode, pizzaMenus);
    rows.push({
      kind: 'set',
      menuName: comp.setName,
      weight: '—',
      minKcal: result.minKcal ?? '—',
      maxKcal: result.maxKcal ?? '—',
      allergen: '',
    });
  });

  return rows;
}

/**
 * 음료 시트 빌더 (용량 파싱 기준)
 */
export function buildBeverageSheet({ menus, rawMap, masterByCode, menuAllergenMap }) {
  return menus
    .filter(m => resolveNutritionGroup(m, masterByCode) === '음료')
    .map(menu => {
      const raw = rawMap[`${menu.menuCode}__석쇠L`] || rawMap[`${menu.menuCode}__씬바사삭L`] || {};
      const volMl = parseVolumeMl(menu.menuName, menu.menuCode);
      const allergen = allergenNames(menuAllergenMap?.get(menu.menuCode));
      return {
        menuName: menu.menuName,
        menuCode: menu.menuCode,
        weight: volMl ?? '—',
        ...Object.fromEntries(
          LABEL_COLS.filter(c => c.key !== 'weight').map(({ key }) => [
            key, volMl ? scaleVal(raw[key], volMl) : '—',
          ])
        ),
        allergen,
      };
    });
}
