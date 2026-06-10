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
import {
  NUTRITION_GROUP_ORDER,
  isPersonalPizzaMenu,
  resolveNutritionGroup,
} from '@/lib/nutrition/menu-group';
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
    return v === '' || v == null ? '—' : roundLabelValue(v);
  }
  return weight ? scaleVal(raw[key], weight) : '—';
}

export function roundLabelValue(value) {
  if (value === '' || value == null || value === undefined || value === '—') return value;
  const num = parseFloat(value);
  return Number.isFinite(num) ? Math.round(num) : value;
}

/** 100g 기준값 → grams 기준으로 환산 (정수 반올림) */
export function scaleVal(per100, grams) {
  if (per100 === '' || per100 == null || per100 === undefined) return '';
  const v = parseFloat(per100);
  if (isNaN(v)) return '';
  return Math.round((v * grams) / 100);
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

function pizzaMenusWithPersonalLast(menus, masterByCode) {
  return menus
    .filter(m => resolveNutritionGroup(m, masterByCode) === '피자')
    .map((menu, index) => ({ menu, index, personal: isPersonalPizzaMenu(menu, masterByCode) }))
    .sort(
      (a, b) =>
        Number(a.personal) - Number(b.personal) ||
        a.index - b.index
    )
    .map(item => item.menu);
}

function groupRank(menu, masterByCode) {
  const group = resolveNutritionGroup(menu, masterByCode);
  const rank = NUTRITION_GROUP_ORDER.indexOf(group);
  return rank === -1 ? NUTRITION_GROUP_ORDER.length : rank;
}

function orderRank(menu, orderedKeys = []) {
  const rank = new Map(
    (Array.isArray(orderedKeys) ? orderedKeys : [])
      .map((key, index) => [String(key || ''), index])
      .filter(([key]) => key)
  );
  const code = String(menu?.menuCode || '');
  const name = String(menu?.menuName || '');
  if (rank.has(code)) return rank.get(code);
  if (rank.has(name)) return rank.get(name);
  return Infinity;
}

export function sortNutritionLabelMenus(menus, masterByCode = {}, orderedKeys = []) {
  return [...(Array.isArray(menus) ? menus : [])].sort(
    (a, b) =>
      orderRank(a, orderedKeys) - orderRank(b, orderedKeys) ||
      groupRank(a, masterByCode) - groupRank(b, masterByCode) ||
      String(a?.menuName || '').localeCompare(String(b?.menuName || ''), 'ko') ||
      String(a?.menuCode || '').localeCompare(String(b?.menuCode || ''), 'ko')
  );
}

function mergeCodeSets(...sets) {
  const merged = new Set();
  sets.forEach(set => {
    if (!(set instanceof Set)) return;
    set.forEach(code => merged.add(code));
  });
  return merged;
}

function allergenText(menuAllergenMap, edgeAllergenMap, menuCode, edgeCode = null) {
  return allergenNames(
    mergeCodeSets(
      menuAllergenMap?.get(menuCode),
      edgeCode ? edgeAllergenMap?.get(edgeCode) : null
    )
  );
}

/* ── 시트 빌더 ──────────────────────────────────────────────── */

/**
 * 피자 시트 빌더
 * @returns {Array<{ menuName, rows:[{ crustLabel, side, ...scaledCols, allergen }] }>}
 */
export function buildPizzaSheet({
  menus,
  rawMap,
  edgeMap,
  masterByCode,
  menuAllergenMap,
  edgeAllergenMap,
}) {
  return pizzaMenusWithPersonalLast(menus, masterByCode)
    .map(menu => {
      const personal = isPersonalPizzaMenu(menu, masterByCode);
      const baseAllergen = allergenText(menuAllergenMap, edgeAllergenMap, menu.menuCode);
      const rows = [];

      if (personal) {
        // 1인피자: 씬바사삭L 행만
        const raw = rawMap[`${menu.menuCode}__씬바사삭L`] || {};
        rows.push({
          crustLabel: '씬바사삭',
          side: 'L',
          ...scaledCols(raw, 150),
          allergen: allergenText(menuAllergenMap, edgeAllergenMap, menu.menuCode, '씬바사삭L'),
        });
      } else {
        // 베이스 크러스트 → L/R 체계
        const crustRows = [
          { crustLabel: '석쇠', crustKey: '석쇠L', side: 'L' },
          { crustLabel: '석쇠', crustKey: '석쇠R', side: 'R' },
          { crustLabel: '씬바사삭', crustKey: '씬바사삭L', side: 'L' },
          { crustLabel: '씬바사삭', crustKey: '씬바사삭R', side: 'R' },
        ];
        crustRows.forEach(({ crustLabel, crustKey, side }) => {
          const raw = rawMap[`${menu.menuCode}__${crustKey}`] || {};
          rows.push({
            crustLabel,
            side,
            ...scaledCols(raw, 150),
            allergen: crustKey.startsWith('씬바사삭')
              ? allergenText(menuAllergenMap, edgeAllergenMap, menu.menuCode, crustKey)
              : baseAllergen,
          });
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
          rows.push({
            crustLabel,
            side,
            ...scaledCols(combined, 150),
            allergen: allergenText(menuAllergenMap, edgeAllergenMap, menu.menuCode, edgeCode),
          });
        });
      }

      return { menuName: menu.menuName, menuCode: menu.menuCode, rows };
    });
}

/** @private 1회제공 조각수 — 1조각 >=100kcal면 1, 아니면 2조각, 2조각도 <=100kcal면 3조각 */
function servingSlices(perSliceKcal, slice) {
  if (!(perSliceKcal > 0)) return slice || 1;
  if (perSliceKcal >= 100) return 1;
  const n = perSliceKcal * 2 <= 100 ? 3 : 2;
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
  edgeAllergenMap,
  sliceCounts,
}) {
  return pizzaMenusWithPersonalLast(menus, masterByCode)
    .map(menu => {
      const personal = isPersonalPizzaMenu(menu, masterByCode);
      const rows = [];

      const pushRow = (crustLabel, side, raw100, baseWeightRaw, edgeCode = null) => {
        const slice = resolveSlices(menu.menuCode, side, sliceCounts, menu, masterByCode);
        const weight = parseFloat(baseWeightRaw?.weight);
        const totalKcal = parseFloat(scaleVal(raw100.kcal, weight));
        const allergen = allergenText(menuAllergenMap, edgeAllergenMap, menu.menuCode, edgeCode);
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
          return total === '' ? '—' : Math.round(parseFloat(total) * factor);
        };
        rows.push({
          crustLabel,
          side,
          slice,
          servingLabel: `${n}조각`,
          weight: Math.round(weight * factor),
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
        pushRow('씬바사삭', 'L', raw, raw, '씬바사삭L');
      } else {
        const baseL = rawMap[`${menu.menuCode}__석쇠L`] || {};
        const baseR = rawMap[`${menu.menuCode}__석쇠R`] || {};
        const thinL = rawMap[`${menu.menuCode}__씬바사삭L`] || {};
        const thinR = rawMap[`${menu.menuCode}__씬바사삭R`] || {};
        pushRow('석쇠', 'L', baseL, baseL);
        pushRow('석쇠', 'R', baseR, baseR);
        pushRow('씬바사삭', 'L', thinL, thinL, '씬바사삭L');
        pushRow('씬바사삭', 'R', thinR, thinR, '씬바사삭R');
        const edgeDefs = [
          { crustLabel: '치즈크러스트', side: 'L', edgeCode: '치즈크러스트L', base: baseL },
          { crustLabel: '치즈크러스트', side: 'R', edgeCode: '치즈크러스트R', base: baseR },
          { crustLabel: '골드스윗', side: 'L', edgeCode: '골드스윗L', base: baseL },
          { crustLabel: '골드스윗', side: 'R', edgeCode: '골드스윗R', base: baseR },
        ];
        edgeDefs.forEach(({ crustLabel, side, edgeCode, base }) => {
          const combined = addNutrition(base, edgeMap[edgeCode] || {});
          pushRow(crustLabel, side, combined, base, edgeCode);
        });
      }

      return { menuName: menu.menuName, menuCode: menu.menuCode, rows };
    });
}

/**
 * 추가토핑 시트 빌더 (1회중량 = weight 필드 기준)
 */
export function buildToppingSheet({ menus, rawMap, masterByCode, menuAllergenMap, menuOrder }) {
  return sortNutritionLabelMenus(menus, masterByCode, menuOrder)
    .filter(m => resolveNutritionGroup(m, masterByCode) === '추가토핑')
    .map(menu => {
      const raw = rawMap[`${menu.menuCode}__석쇠L`] || rawMap[`${menu.menuCode}__씬바사삭L`] || {};
      const isServing = raw.basis === 'serving';
      const weight = isServing ? (raw.weight ?? '—') : parseFloat(raw.weight) || null;
      const displayWeight = isServing ? roundLabelValue(weight) : roundLabelValue(weight ?? '—');
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
export function buildSideSheet({ menus, rawMap, masterByCode, menuAllergenMap, menuOrder }) {
  return sortNutritionLabelMenus(menus, masterByCode, menuOrder)
    .filter(m => resolveNutritionGroup(m, masterByCode) === '사이드')
    .map(menu => {
      const raw = rawMap[`${menu.menuCode}__석쇠L`] || rawMap[`${menu.menuCode}__씬바사삭L`] || {};
      const isServing = raw.basis === 'serving';
      const weight = isServing ? (raw.weight ?? '—') : parseFloat(raw.weight) || null;
      const displayWeight = isServing ? roundLabelValue(weight) : roundLabelValue(weight ?? '—');
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
  const pizzaMenus = pizzaMenusWithPersonalLast(menus, masterByCode);
  const halfResult = calcHalfMinMax(pizzaMenus, rawMap, edgeMap || {});

  const rows = [];

  // 하프앤하프 행 (자동) — L/R 사이즈별 1회중량 = 최소조합 두 반쪽 합계
  ['L', 'R'].forEach(side => {
    const sideResult = halfResult.bySide?.[side] || {};
    rows.push({
      kind: 'half',
      side,
      menuName: `하프앤하프 ${side}`,
      weight: sideResult.minWeight ?? '—',
      minKcal: sideResult.minKcal ?? '—',
      maxKcal: sideResult.maxKcal ?? '—',
      allergen: '',
    });
  });

  // 저장된 세트박스
  (setComps || [])
    .filter(c => c.kind === 'set')
    .filter(c => ['L', 'R'].includes(c.setSide))
    .forEach(comp => {
      const side = comp.setSide === 'R' ? 'R' : 'L';
      const result = calcSetMinMax(
        comp.slots || [],
        menus,
        rawMap,
        masterByCode,
        pizzaMenus,
        edgeMap || {}
      );
      const sideResult = result.bySize?.[side] || {};
      rows.push({
        kind: 'set',
        side,
        menuName: `${comp.setName} ${side}세트`,
        weight: '—',
        minKcal: sideResult.minKcal ?? '—',
        maxKcal: sideResult.maxKcal ?? '—',
        allergen: '',
      });
    });

  return rows;
}

/**
 * 음료 시트 빌더 (용량 파싱 기준)
 */
export function buildBeverageSheet({ menus, rawMap, masterByCode, menuAllergenMap, menuOrder }) {
  return sortNutritionLabelMenus(menus, masterByCode, menuOrder)
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
