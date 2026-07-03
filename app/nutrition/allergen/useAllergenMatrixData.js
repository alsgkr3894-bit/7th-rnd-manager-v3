'use client';

import { useCallback, useMemo } from 'react';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { buildMenuMatrix } from '@/lib/nutrition/allergen/matrix';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { filterMenuMatrix, orderAllergens } from './allergenPageDataUtils';

export function useAllergenMatrixData({
  allergenIngredients,
  menuMasters,
  baseMapData,
  edges,
  toppings,
  menuOrder,
  allergenOrder,
  menuNameOverrides,
  search,
}) {
  const { excludedMenuCodes, excludedMenuNames } = useMemo(
    () => extractExcludedMenuSets(menuMasters),
    [menuMasters]
  );

  const isExcludedMenu = useCallback(
    (menuCode, menuName) =>
      excludedMenuCodes.has(menuCode) ||
      excludedMenuCodes.has(asDisplayText(menuCode)) ||
      excludedMenuNames.has(asDisplayText(menuName).trim()),
    [excludedMenuCodes, excludedMenuNames]
  );

  const menuMatrixAll = useMemo(
    () =>
      buildMenuMatrix(
        allergenIngredients,
        baseMapData,
        edges,
        isExcludedMenu,
        menuOrder,
        menuNameOverrides,
        toppings,
        menuMasters
      ),
    [
      allergenIngredients,
      baseMapData,
      edges,
      isExcludedMenu,
      menuOrder,
      menuNameOverrides,
      toppings,
      menuMasters,
    ]
  );

  const orderedAllergens = useMemo(
    () => orderAllergens(allergenOrder, menuMatrixAll),
    [allergenOrder, menuMatrixAll]
  );

  const menuMatrix = useMemo(
    () => filterMenuMatrix(menuMatrixAll, search),
    [menuMatrixAll, search]
  );

  const allergenMatchedMenuCount = useMemo(() => {
    const menuCodes = new Set();
    for (const row of menuMatrixAll) {
      const allergenCodes = row.allergenCodes instanceof Set ? row.allergenCodes : new Set();
      if (allergenCodes.size) menuCodes.add(asDisplayText(row.menuCode));
    }
    return menuCodes.size;
  }, [menuMatrixAll]);

  return {
    isExcludedMenu,
    menuMatrixAll,
    menuMatrix,
    orderedAllergens,
    allergenMatchedMenuCount,
  };
}
