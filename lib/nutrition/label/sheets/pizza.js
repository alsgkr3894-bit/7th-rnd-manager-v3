import {
  addNutrition,
  allergenText,
  isPersonalPizzaMenu,
  pizzaMenusWithPersonalLast,
  resolveSlices,
  scaleVal,
  scaledCols,
  servingSlices,
  THIN_CRUST_CODE,
  THIN_CRUST_LABEL,
} from '../_utils.js';

export function buildPizzaSheet({
  menus,
  rawMap,
  edgeMap,
  masterByCode,
  menuAllergenMap,
  edgeAllergenMap,
}) {
  return pizzaMenusWithPersonalLast(menus, masterByCode).map(menu => {
    const personal = isPersonalPizzaMenu(menu, masterByCode);
    const baseAllergen = allergenText(menuAllergenMap, edgeAllergenMap, menu.menuCode);
    const rows = [];

    if (personal) {
      const raw = rawMap[`${menu.menuCode}__${THIN_CRUST_CODE}`] || {};
      rows.push({
        crustLabel: THIN_CRUST_LABEL,
        side: 'L',
        ...scaledCols(raw, 150),
        allergen: allergenText(menuAllergenMap, edgeAllergenMap, menu.menuCode, THIN_CRUST_CODE),
      });
    } else {
      const crustRows = [
        { crustLabel: '석쇠', crustKey: '석쇠L', side: 'L' },
        { crustLabel: '석쇠', crustKey: '석쇠R', side: 'R' },
        { crustLabel: THIN_CRUST_LABEL, crustKey: THIN_CRUST_CODE, side: 'L' },
      ];
      crustRows.forEach(({ crustLabel, crustKey, side }) => {
        const raw = rawMap[`${menu.menuCode}__${crustKey}`] || {};
        rows.push({
          crustLabel,
          side,
          ...scaledCols(raw, 150),
          allergen: crustKey === THIN_CRUST_CODE
            ? allergenText(menuAllergenMap, edgeAllergenMap, menu.menuCode, crustKey)
            : baseAllergen,
        });
      });

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

export function buildPizzaSliceSheet({
  menus,
  rawMap,
  edgeMap,
  masterByCode,
  menuAllergenMap,
  edgeAllergenMap,
  sliceCounts,
}) {
  return pizzaMenusWithPersonalLast(menus, masterByCode).map(menu => {
    const personal = isPersonalPizzaMenu(menu, masterByCode);
    const rows = [];

    const pushRow = (crustLabel, side, raw100, baseWeightRaw, edgeCode = null) => {
      const slice = resolveSlices(menu.menuCode, side, sliceCounts, menu, masterByCode);
      const weight = parseFloat(baseWeightRaw?.weight);
      const totalKcal = parseFloat(scaleVal(raw100.kcal, weight));
      const allergen = allergenText(menuAllergenMap, edgeAllergenMap, menu.menuCode, edgeCode);
      if (isNaN(weight) || weight <= 0 || isNaN(totalKcal) || totalKcal <= 0) {
        rows.push({ crustLabel, side, slice, servingLabel: '—', weight: '—', kcal: '—', sugar: '—', protein: '—', fat: '—', sodium: '—', allergen });
        return;
      }
      const perSliceKcal = slice > 0 ? totalKcal / slice : 0;
      const n = servingSlices(perSliceKcal, slice);
      const factor = slice > 0 ? n / slice : 1;
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
        fat: col('fat'),
        sodium: col('sodium'),
        allergen,
      });
    };

    if (personal) {
      const raw = rawMap[`${menu.menuCode}__${THIN_CRUST_CODE}`] || {};
      pushRow(THIN_CRUST_LABEL, 'L', raw, raw, THIN_CRUST_CODE);
    } else {
      const baseL = rawMap[`${menu.menuCode}__석쇠L`] || {};
      const baseR = rawMap[`${menu.menuCode}__석쇠R`] || {};
      const thinL = rawMap[`${menu.menuCode}__${THIN_CRUST_CODE}`] || {};
      pushRow('석쇠', 'L', baseL, baseL);
      pushRow('석쇠', 'R', baseR, baseR);
      pushRow(THIN_CRUST_LABEL, 'L', thinL, thinL, THIN_CRUST_CODE);
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
