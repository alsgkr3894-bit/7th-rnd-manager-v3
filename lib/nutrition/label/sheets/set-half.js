import {
  calcHalfMinMax,
  calcSetMinMax,
  isPersonalPizzaMenu,
  pizzaMenusWithPersonalLast,
} from '../_utils.js';
import { applyOrder } from '@/lib/nutrition/order';
import { applyMenuName } from '@/lib/nutrition/menu-name-override';

export function buildSetHalfSheet({
  menus,
  rawMap,
  edgeMap,
  masterByCode,
  menuAllergenMap,
  setComps,
  setOrder = [],
  nameOverrides = {},
}) {
  const pizzaMenus = pizzaMenusWithPersonalLast(menus, masterByCode);
  // 1인용 피자는 한 사람 몫의 완제품이라 하프앤하프(반반) 결합 후보에서 제외한다.
  // 세트박스의 피자 슬롯은 그대로 1인용을 포함할 수 있으므로 pizzaMenus 자체는 유지한다.
  const halfPizzaMenus = pizzaMenus.filter(m => !isPersonalPizzaMenu(m, masterByCode));
  const halfResult = calcHalfMinMax(halfPizzaMenus, rawMap, edgeMap || {});

  const rows = [];
  const weightRange = result => {
    const min = result?.minWeight;
    const max = result?.maxWeight;
    if (min == null && max == null) return '—';
    if (min == null || max == null || min === max) return min ?? max;
    return `${min}~${max}`;
  };

  ['L', 'R'].forEach(side => {
    const sideResult = halfResult.bySide?.[side] || {};
    rows.push({
      kind: 'half',
      side,
      menuName: `하프앤하프 ${side}`,
      weight: weightRange(sideResult),
      minKcal: sideResult.minKcal ?? '—',
      maxKcal: sideResult.maxKcal ?? '—',
      allergen: '',
    });
  });

  // 세트박스는 "출력명·순서" 편집에서 저장한 setOrder(세트명 기준)로 정렬한다.
  const setRows = (setComps || [])
    .filter(c => c.kind === 'set')
    .filter(c => ['L', 'R'].includes(c.setSide));
  const setNames = [...new Set(setRows.map(c => String(c.setName || '')).filter(Boolean))];
  const orderedSetNames = applyOrder(
    setNames.map(setName => ({ setName })),
    setOrder,
    item => item.setName,
    item => item.setName
  ).map(item => item.setName);

  orderedSetNames.forEach(setName => {
    ['L', 'R'].forEach(side => {
      const comp = setRows.find(c => c.setName === setName && c.setSide === side);
      if (!comp) return;
      const result = calcSetMinMax(
        comp.slots || [],
        menus,
        rawMap,
        masterByCode,
        pizzaMenus,
        edgeMap || {}
      );
      const sideResult = result.bySize?.[side] || {};
      const displayName = applyMenuName(setName, setName, nameOverrides);
      rows.push({
        kind: 'set',
        side,
        menuName: `${displayName} ${side}세트`,
        weight: weightRange(sideResult),
        minKcal: sideResult.minKcal ?? '—',
        maxKcal: sideResult.maxKcal ?? '—',
        allergen: '',
      });
    });
  });

  return rows;
}
