import {
  combineBaseWithEdge,
  allergenText,
  isPersonalPizzaMenu,
  labelFieldValue,
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
          allergen:
            crustKey === THIN_CRUST_CODE
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
        // 엣지 영양값은 한판 기준 절대 총량 — 총량 합산 후 합산 중량 기준 100g 값으로 환산
        const combined = combineBaseWithEdge(base, edge);
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
        rows.push({
          crustLabel,
          side,
          slice,
          servingLabel: '—',
          totalWeight: '—',
          weight: '—',
          kcal: '—',
          sugar: '—',
          protein: '—',
          fat: '—',
          sodium: '—',
          allergen,
          servingTrace: {
            status: 'missing',
            reason: 'missing-weight-or-kcal',
            totalWeight: null,
            sliceCount: slice,
            perSliceWeight: null,
            totalKcal: null,
            perSliceKcal: null,
            servingSlices: null,
          },
        });
        return;
      }
      const perSliceKcal = slice > 0 ? totalKcal / slice : 0;
      const perSliceWeight = slice > 0 ? weight / slice : 0;
      // 1인용 피자는 1인분 제품이라 한판(전체 조각)을 1회 제공량으로 표기한다.
      // 일반 피자는 100g 기준으로 조각을 1/2/3개로 묶어 1회 제공량을 정한다.
      const n = personal ? slice : servingSlices(perSliceWeight, slice);
      const factor = slice > 0 ? n / slice : 1;
      const col = key => {
        // 100g값 → 총량 → 1회분(×factor)을 마지막에 한 번만 반올림한다.
        // 중간에 정수 반올림하면 소수부가 유실돼 조각당 값이 ±1 어긋난다.
        const per100 = labelFieldValue(raw100, key);
        if (per100 === '' || per100 == null) return '—';
        const v = parseFloat(per100);
        if (!Number.isFinite(v)) return '—';
        return Math.round((v * weight * factor) / 100);
      };
      rows.push({
        crustLabel,
        side,
        slice,
        servingLabel: `${n}조각`,
        totalWeight: Math.round(weight),
        weight: Math.round(weight * factor),
        kcal: col('kcal'),
        sugar: col('sugar'),
        protein: col('protein'),
        fat: col('fat'),
        sodium: col('sodium'),
        allergen,
        servingTrace: {
          status: 'ok',
          totalWeight: Math.round(weight),
          sliceCount: slice,
          perSliceWeight: slice > 0 ? Math.round(weight / slice) : null,
          totalKcal,
          perSliceKcal,
          servingSlices: n,
        },
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
        // combined.weight = 베이스+엣지 총중량, 영양값 = 합산 총량 기준 100g 값.
        // pushRow가 100g 값 × 총중량으로 다시 총량을 만들므로 조각 값이 정확히 유지된다.
        const combined = combineBaseWithEdge(base, edgeMap[edgeCode] || {});
        pushRow(crustLabel, side, combined, combined, edgeCode);
      });
    }

    return { menuName: menu.menuName, menuCode: menu.menuCode, rows };
  });
}
