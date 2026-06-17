import {
  calcHalfMinMax,
  calcSetMinMax,
  pizzaMenusWithPersonalLast,
} from '../_utils.js';

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
