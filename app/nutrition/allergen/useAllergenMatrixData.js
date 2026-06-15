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
        toppings
      ),
    [
      allergenIngredients,
      baseMapData,
      edges,
      isExcludedMenu,
      menuOrder,
      menuNameOverrides,
      toppings,
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

  return {
    isExcludedMenu,
    menuMatrixAll,
    menuMatrix,
    orderedAllergens,
  };
}
