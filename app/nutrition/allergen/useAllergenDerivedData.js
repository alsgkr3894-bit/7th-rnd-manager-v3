'use client';

import { useCallback, useMemo } from 'react';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { buildMenuMatrix } from '@/lib/nutrition/allergen/matrix';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { buildAllergenDetailRows, buildAllergenSummaryCounts } from './allergenPageDetailUtils';
import {
  buildAllergenListForOrder,
  buildMenuListForOrder,
  buildMenuNameEditMenus,
} from './allergenPageOutputUtils';
import {
  filterAllergenIngredients,
  filterIngredientRows,
  filterMenuMatrix,
  orderAllergens,
} from './allergenPageDataUtils';

export function useAllergenDerivedData({
  ingredients,
  menuMasters,
  baseMapData,
  edges,
  toppings,
  menuOrder,
  allergenOrder,
  menuNameOverrides,
  detailRow,
  search,
}) {
  const allergenIngredients = useMemo(() => filterAllergenIngredients(ingredients), [ingredients]);

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

  const ingredientRows = useMemo(
    () => filterIngredientRows(allergenIngredients, search),
    [allergenIngredients, search]
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

  const detailRows = useMemo(
    () => buildAllergenDetailRows(detailRow, baseMapData, edges, allergenIngredients),
    [allergenIngredients, baseMapData, detailRow, edges]
  );

  const menuMatrix = useMemo(
    () => filterMenuMatrix(menuMatrixAll, search),
    [menuMatrixAll, search]
  );

  const menuListForOrder = useMemo(() => buildMenuListForOrder(menuMatrixAll), [menuMatrixAll]);

  const allergenListForOrder = useMemo(
    () => buildAllergenListForOrder(orderedAllergens),
    [orderedAllergens]
  );

  const menuNameEditMenus = useMemo(
    () => buildMenuNameEditMenus(menuListForOrder),
    [menuListForOrder]
  );

  const { totalWithAllergen, totalIngredients } = useMemo(
    () => buildAllergenSummaryCounts(ingredients, allergenIngredients),
    [allergenIngredients, ingredients]
  );

  return {
    ingredientRows,
    isExcludedMenu,
    menuMatrix,
    orderedAllergens,
    detailRows,
    menuListForOrder,
    allergenListForOrder,
    menuNameEditMenus,
    totalWithAllergen,
    totalIngredients,
  };
}
