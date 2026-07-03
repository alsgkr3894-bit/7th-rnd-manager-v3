'use client';

import { useMemo } from 'react';
import { buildAllergenDetailRows, buildAllergenSummaryCounts } from './allergenPageDetailUtils';
import {
  buildAllergenListForOrder,
  buildMenuListForOrder,
  buildMenuNameEditMenus,
} from './allergenPageOutputUtils';
import { filterAllergenIngredients, filterIngredientRows } from './allergenPageDataUtils';
import { useAllergenMatrixData } from './useAllergenMatrixData';

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

  const ingredientRows = useMemo(
    () => filterIngredientRows(allergenIngredients, search),
    [allergenIngredients, search]
  );

  const {
    isExcludedMenu,
    menuMatrixAll,
    menuMatrix,
    orderedAllergens,
    allergenMatchedMenuCount,
  } = useAllergenMatrixData({
    allergenIngredients,
    menuMasters,
    baseMapData,
    edges,
    toppings,
    menuOrder,
    allergenOrder,
    menuNameOverrides,
    search,
  });

  const detailRows = useMemo(
    () => buildAllergenDetailRows(detailRow, baseMapData, edges, allergenIngredients),
    [allergenIngredients, baseMapData, detailRow, edges]
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
    allergenMatchedMenuCount,
  };
}
