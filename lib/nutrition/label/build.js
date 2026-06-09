/**
 * lib/nutrition/label/build.js — 영양성분표 출력 데이터 빌더 (순수 함수)
 *
 * 시트1 피자           : 메뉴별 크러스트/엣지 행 (150g 기준)
 * 시트2 추가토핑       : 1회중량(weight 필드) 기준
 * 시트3 사이드·파스타  : 1회중량(weight 필드) 기준
 * 시트4 세트박스·하프앤하프: 최소/최대 열량 (세트 계산 결과)
 * 시트1b 피자(조각)   : 한판 중량과 조각수 기준
 * 시트5 음료           : 총용량(parseVolumeMl) 기준
 *
 * 모든 rawMap 값은 100g 기준 저장 → scaleVal()로 환산.
 */

import { addNutrition } from '@/lib/nutrition/values/store';
import { calcSetMinMax, calcHalfMinMax } from '@/lib/nutrition/values/set-calc';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import { allergenNames } from '@/lib/nutrition/allergen/aggregate';
import { resolveSlices } from '@/lib/nutrition/slice-config';

/** 레이블 출력 컬럼 정의 */
export const LABEL_COLS = [
  { key: 'weight', label: '1회중량', unit: 'g' },
  { key: 'kcal', label: '열량', unit: 'kcal' },
  { key: 'sugar', label: '당류', unit: 'g' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'satFat', label: '포화지방', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
];

/** basis='serving' 행은 저장값 그대로, 아니면 scaleVal로 환산 */
function displayVal(raw, key, weight) {
  if (raw.basis === 'serving') {
    const v = raw[key];
    return v === '' || v == null ? '—' : v;
  }
  return weight ? scaleVal(raw[key], weight) : '—';
}

/** 100g 기준값 → grams 기준으로 환산 (소수 1자리) */
export function scaleVal(per100, grams) {
  if (per100 === '' || per100 == null || per100 === undefined) return '';
  const v = parseFloat(per100);
  if (isNaN(v)) return '';
  return Math.round(((v * grams) / 100) * 10) / 10;
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
    if (key === 'weight') {
      res.weight = grams;
      return;
    }
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
          crustLabel: '씬바사삭',
          side: 'L',
          ...scaledCols(raw, 150),
          allergen,
        });
      } else {
        // 베이스 3종 → 2행(L/R) 체계
        const crustRows = [
          { crustLabel: '석쇠', crustKey: '석쇠L', side: 'L' },
          { crustLabel: '석쇠', crustKey: '석쇠R', side: 'R' },
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
          { crustLabel: '골드스윗', side: 'L', edgeCode: '골드스윗L', baseCrust: '석쇠L' },
          { crustLabel: '골드스윗', side: 'R', edgeCode: '골드스윗R', baseCrust: '석쇠R' },
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

/** @private 1회제공량 조각수 — 1조각>100kcal이면 1, 100 이하이면 100kcal를 처음 넘는 최소 조각수(조각수로 클램프) */
function servingSlices(perSliceKcal, slice) {
  if (!(perSliceKcal > 0)) return slice || 1;
  if (perSliceKcal > 100) return 1;
  const n = Math.floor(100 / perSliceKcal) + 1;
  return Math.min(n, slice || n);
}

/**
 * 피자 조각 단위 시트 빌더.
 * 한판 총중량(raw.weight) 기준 총영양 → 조각수로 나눠 1회제공량(조각) 산출.
 * weight 미입력 행은 '—'. 엣지 행은 베이스 석쇠 중량을 사용(엣지 전용 중량 데이터 없음).
 *
 * @returns {Array<{ menuName, menuCode, rows:[{ crustLabel, side, slice, servingLabel, weight, kcal, sugar, protein, satFat, sodium, allergen }] }>}
 */
export function buildPizzaSliceSheet({
  menus,
  rawMap,
  edgeMap,
  masterByCode,
  menuAllergenMap,
  sliceCounts,
}) {
  return menus
    .filter(m => resolveNutritionGroup(m, masterByCode) === '피자')
    .map(menu => {
      const personal = isPersonalPizza(menu, masterByCode);
      const allergen = allergenNames(menuAllergenMap?.get(menu.menuCode));
      const rows = [];

      const pushRow = (crustLabel, side, raw100, baseWeightRaw) => {
        const slice = resolveSlices(menu.menuCode, side, sliceCounts, menu, masterByCode);
        const weight = parseFloat(baseWeightRaw?.weight);
        const totalKcal = parseFloat(scaleVal(raw100.kcal, weight));
        // 중량 또는 열량이 없으면 조각 산출 불가 → 행 전체 '—'
        if (isNaN(weight) || weight <= 0 || isNaN(totalKcal) || totalKcal <= 0) {
          rows.push({
            crustLabel,
            side,
            slice,
            servingLabel: '—',
            weight: '—',
            kcal: '—',
            sugar: '—',
            protein: '—',
            satFat: '—',
            sodium: '—',
            allergen,
          });
          return;
        }
        const perSliceKcal = slice > 0 ? totalKcal / slice : 0;
        const n = servingSlices(perSliceKcal, slice);
        const factor = slice > 0 ? n / slice : 1; // 총량 대비 1회제공량 비율
        const col = key => {
          const total = scaleVal(raw100[key], weight);
          return total === '' ? '—' : Math.round(parseFloat(total) * factor * 10) / 10;
        };
        rows.push({
          crustLabel,
          side,
          slice,
          servingLabel: `${n}조각`,
          weight: Math.round(weight * factor * 10) / 10,
          kcal: col('kcal'),
          sugar: col('sugar'),
          protein: col('protein'),
          satFat: col('satFat'),
          sodium: col('sodium'),
          allergen,
        });
      };

      if (personal) {
        const raw = rawMap[`${menu.menuCode}__씬바사삭L`] || {};
        pushRow('씬바사삭', 'L', raw, raw);
      } else {
        const baseL = rawMap[`${menu.menuCode}__석쇠L`] || {};
        const baseR = rawMap[`${menu.menuCode}__석쇠R`] || {};
        const thin = rawMap[`${menu.menuCode}__씬바사삭L`] || {};
        pushRow('석쇠', 'L', baseL, baseL);
        pushRow('석쇠', 'R', baseR, baseR);
        pushRow('씬바사삭', 'L', thin, thin);
        const edgeDefs = [
          { crustLabel: '치즈크러스트', side: 'L', edgeCode: '치즈크러스트L', base: baseL },
          { crustLabel: '치즈크러스트', side: 'R', edgeCode: '치즈크러스트R', base: baseR },
          { crustLabel: '골드스윗', side: 'L', edgeCode: '골드스윗L', base: baseL },
          { crustLabel: '골드스윗', side: 'R', edgeCode: '골드스윗R', base: baseR },
        ];
        edgeDefs.forEach(({ crustLabel, side, edgeCode, base }) => {
          const combined = addNutrition(base, edgeMap[edgeCode] || {});
          pushRow(crustLabel, side, combined, base);
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
      const isServing = raw.basis === 'serving';
      const weight = isServing ? (raw.weight ?? '—') : parseFloat(raw.weight) || null;
      const displayWeight = isServing ? weight : (weight ?? '—');
      const allergen = allergenNames(menuAllergenMap?.get(menu.menuCode));
      return {
        menuName: menu.menuName,
        menuCode: menu.menuCode,
        weight: displayWeight,
        ...Object.fromEntries(
          LABEL_COLS.filter(c => c.key !== 'weight').map(({ key }) => [
            key,
            displayVal(raw, key, isServing ? null : weight),
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
      const isServing = raw.basis === 'serving';
      const weight = isServing ? (raw.weight ?? '—') : parseFloat(raw.weight) || null;
      const displayWeight = isServing ? weight : (weight ?? '—');
      const allergen = allergenNames(menuAllergenMap?.get(menu.menuCode));
      return {
        menuName: menu.menuName,
        menuCode: menu.menuCode,
        weight: displayWeight,
        ...Object.fromEntries(
          LABEL_COLS.filter(c => c.key !== 'weight').map(({ key }) => [
            key,
            displayVal(raw, key, isServing ? null : weight),
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
export function buildSetHalfSheet({
  menus,
  rawMap,
  edgeMap,
  masterByCode,
  menuAllergenMap,
  setComps,
}) {
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
  (setComps || [])
    .filter(c => c.kind === 'set')
    .forEach(comp => {
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
            key,
            volMl ? scaleVal(raw[key], volMl) : '—',
          ])
        ),
        allergen,
      };
    });
}
