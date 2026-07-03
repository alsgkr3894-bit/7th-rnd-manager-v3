import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const DASH = '—';

export function formatNutritionPosterMonth(date = new Date()) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 기준`;
}

export function nutritionValue(value, fallback = DASH) {
  const text = asDisplayText(value);
  return text && text !== DASH ? text : fallback;
}

function normalizeMenuKey(value, index) {
  return asDisplayText(value, `메뉴 ${index + 1}`);
}

export function displayNutritionMenuName(value, fallback = '메뉴') {
  let text = asDisplayText(value, fallback);
  let previous = '';

  while (text && text !== previous) {
    previous = text;
    text = text
      .replace(/(?:\s+|\s*[\(（])(?:L|R)(?:\s*사이즈)?[\)）]?\s*$/iu, '')
      .trim();
  }

  return text || fallback;
}

function servingPieces(value) {
  const text = asDisplayText(value);
  const match = text.match(/(\d+(?:\.\d+)?)/);
  const n = match ? Number(match[1]) : 0;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function inferTotalWeight(row) {
  const weight = Number(row?.weight);
  const slice = Number(row?.slice);
  const pieces = servingPieces(row?.servingLabel);
  if (!Number.isFinite(weight) || !Number.isFinite(slice) || weight <= 0 || slice <= 0) return DASH;
  return Math.round((weight * slice) / pieces);
}

function mergeAllergenText(...values) {
  const seen = new Set();
  values
    .map(value => asDisplayText(value))
    .filter(Boolean)
    .forEach(value => {
      value
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
        .forEach(part => seen.add(part));
    });
  return seen.size ? [...seen].join(', ') : DASH;
}

export function buildPosterPizzaRows(pizzaSliceSheet, pizza150Sheet = []) {
  const byMenu = new Map();
  const menuOrder = [];

  const ensureCrustRow = (group, groupIndex, row) => {
    const menuName = displayNutritionMenuName(normalizeMenuKey(group?.menuName, groupIndex));
    if (!byMenu.has(menuName)) {
      byMenu.set(menuName, new Map());
      menuOrder.push(menuName);
    }
    const byCrust = byMenu.get(menuName);
    const crustLabel = nutritionValue(row?.crustLabel);
    if (!byCrust.has(crustLabel)) {
      byCrust.set(crustLabel, { menuName, crustLabel, sides: {}, per150Sides: {} });
    }
    return byCrust.get(crustLabel);
  };

  asObjectArray(pizzaSliceSheet).forEach((group, groupIndex) => {
    asObjectArray(group?.rows).forEach(row => {
      const crustRow = ensureCrustRow(group, groupIndex, row);
      const side = String(row?.side || 'L').toUpperCase() === 'R' ? 'R' : 'L';
      crustRow.sides[side] = {
        ...row,
        totalWeight: inferTotalWeight(row),
      };
    });
  });

  asObjectArray(pizza150Sheet).forEach((group, groupIndex) => {
    asObjectArray(group?.rows).forEach(row => {
      const crustRow = ensureCrustRow(group, groupIndex, row);
      const side = String(row?.side || 'L').toUpperCase() === 'R' ? 'R' : 'L';
      crustRow.per150Sides[side] = row;
    });
  });

  const rows = [];
  menuOrder.forEach(menuName => {
    const byCrust = byMenu.get(menuName);
    const crustRows = [...byCrust.values()];
    crustRows.forEach((row, index) => {
      rows.push({
        ...row,
        rowSpan: crustRows.length,
        firstOfMenu: index === 0,
      });
    });
  });

  return rows;
}

export function pairValue(row, key, side) {
  return nutritionValue(row?.sides?.[side]?.[key]);
}

export function pair150Value(row, key, side) {
  return nutritionValue(row?.per150Sides?.[side]?.[key]);
}

export function pairAllergen(row) {
  return mergeAllergenText(
    row?.sides?.L?.allergen,
    row?.sides?.R?.allergen,
    row?.per150Sides?.L?.allergen,
    row?.per150Sides?.R?.allergen
  );
}

export function splitSideAndPastaRows(sideSheet) {
  const sideRows = [];
  const pastaRows = [];
  asObjectArray(sideSheet).forEach(row => {
    const name = asDisplayText(row?.menuName);
    if (/파스타|스파게티|리조또/i.test(name)) pastaRows.push(row);
    else sideRows.push(row);
  });
  return { sideRows, pastaRows };
}

export function splitSetHalfRows(setHalfSheet) {
  const setRows = [];
  const halfRows = [];
  asObjectArray(setHalfSheet).forEach(row => {
    if (row?.kind === 'half') halfRows.push(row);
    else setRows.push(row);
  });
  return { setRows, halfRows };
}

export function compactRows(rows, limit) {
  const safeRows = asObjectArray(rows);
  if (!Number.isFinite(limit) || limit <= 0) return safeRows;
  return safeRows.slice(0, limit);
}
