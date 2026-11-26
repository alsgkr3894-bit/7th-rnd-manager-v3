/**
 * lib/menu-master/readiness-nutrition-derived.js — 메뉴별 입력값 없이 영양성분표에 값이 나오는 메뉴.
 *
 * 음료는 매장 고정표를, 세트박스는 구성 메뉴의 합산 범위를 출력한다. 점검이 입력값만 보면
 * 값이 출력되는데도 "영양성분 값 미입력"으로 알리게 된다(2026-11-26).
 */
import { findFixedBeverageRow } from '@/lib/nutrition/label/fixed-beverages';
import {
  applyOutputAliasesToLabelInputs,
  mergeLabelMenuRefs,
} from '@/lib/nutrition/label/menu-inputs';
import { buildSetHalfSheet } from '@/lib/nutrition/label/sheets/set-half';
import { buildMasterByCode } from '@/lib/nutrition/menu-group';
import { buildRawValueMapFromRows } from '@/lib/nutrition/values/dedup';
import {
  buildDiscontinuedBaseCodeSet,
  isNutritionMenuDiscontinued,
} from '@/lib/nutrition/menu-master-diagnostics';
import { buildOutputAliasMap } from './output-alias';
import { isBeverageCategory, isSetCategory } from './category-policy';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const SIDE_SUFFIX = /(?:\s+|-)([LR])$/i;

const setKey = (name, side) =>
  `${asDisplayText(name).replace(/\s+/g, '').toLowerCase()}|${asDisplayText(side).toUpperCase()}`;

/** 최소·최대 열량이 모두 계산되는 세트박스(이름·사이즈) */
function computedSetKeys({ menuMasters, menuRefs, rawValues, nutritionEdges, setComps }) {
  const aliasMap = buildOutputAliasMap(menuMasters);
  const inputs = applyOutputAliasesToLabelInputs({
    menuRefs: mergeLabelMenuRefs(menuRefs, menuMasters),
    rawMap: buildRawValueMapFromRows(asObjectArray(rawValues)),
    aliasMap,
  });
  const discontinued = buildDiscontinuedBaseCodeSet(menuMasters);
  const rows = buildSetHalfSheet({
    menus: inputs.menuRefs.filter(m => !isNutritionMenuDiscontinued(m.menuCode, discontinued)),
    rawMap: inputs.rawMap,
    edgeMap: Object.fromEntries(asObjectArray(nutritionEdges).map(e => [e.edgeCode, e])),
    masterByCode: buildMasterByCode(menuMasters),
    setComps,
  });
  return new Set(
    rows
      .filter(row => row.kind === 'set')
      .filter(row => Number.isFinite(row.minKcal) && Number.isFinite(row.maxKcal))
      .map(row => setKey(row.setName, row.side))
  );
}

export function findDerivedNutritionCodes(input) {
  const masters = asObjectArray(input?.menuMasters);
  const codes = masters
    .filter(m => isBeverageCategory(m.category) && findFixedBeverageRow(m.menuName, m.menuCode))
    .map(m => m.menuCode);

  const sets = masters.filter(m => isSetCategory(m.category));
  if (!sets.length || !asObjectArray(input.setComps).length) return codes;
  const computed = computedSetKeys({ ...input, menuMasters: masters });
  for (const menu of sets) {
    const name = asDisplayText(menu.menuName);
    const side = asDisplayText(menu.size) || asDisplayText(menu.menuCode).match(SIDE_SUFFIX)?.[1];
    if (computed.has(setKey(name.replace(SIDE_SUFFIX, ''), side))) codes.push(menu.menuCode);
  }
  return codes;
}
