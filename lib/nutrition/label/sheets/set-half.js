import {
  calcHalfMinMax,
  calcSetMinMax,
  isPersonalPizzaMenu,
  pizzaMenusWithPersonalLast,
} from '../_utils.js';
import { applyOrder } from '@/lib/nutrition/order';
import { applyMenuName } from '@/lib/nutrition/menu-name-override';

// 세트박스·하프앤하프의 "1회 중량"은 계산된 총중량 범위가 아니라 매장 표기 기준 299g으로
// 고정한다(2026-09-22 주임님 지시). 최소/최대 열량은 구성 전체 기준 그대로.
export const SET_HALF_SERVING_WEIGHT_G = 299;

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
  // 1인용 피자는 한 사람 몫의 완제품이라 하프앤하프(반반)·세트박스(자동 피자 후보) 모두에서 제외한다.
  const pizzaMenus = pizzaMenusWithPersonalLast(menus, masterByCode).filter(
    m => !isPersonalPizzaMenu(m, masterByCode)
  );
  const halfResult = calcHalfMinMax(pizzaMenus, rawMap, edgeMap || {});

  const rows = [];

  ['L', 'R'].forEach(side => {
    const sideResult = halfResult.bySide?.[side] || {};
    rows.push({
      kind: 'half',
      side,
      menuName: `하프앤하프 ${side}`,
      weight: SET_HALF_SERVING_WEIGHT_G,
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
        weight: SET_HALF_SERVING_WEIGHT_G,
        minKcal: sideResult.minKcal ?? '—',
        maxKcal: sideResult.maxKcal ?? '—',
        allergen: '',
      });
    });
  });

  return rows;
}
