'use client';
import { useState, useMemo, useCallback } from 'react';
import { downloadCsv } from '@/lib/download';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { buildMenuMatrix, buildDetailRows } from '@/lib/nutrition/allergen/matrix';
import {
  buildAllergenCsvRows,
  buildAllergenListForOrder,
  buildIngredientByKey,
  buildMenuListForOrder,
  buildMenuNameEditMenus,
  filterAllergenIngredients,
  filterIngredientRows,
  filterMenuMatrix,
  orderAllergens,
} from './allergenPageDataUtils';
import { useAllergenOrderState } from './useAllergenOrderState';
import { useAllergenSourceData } from './useAllergenSourceData';

export function useAllergenPageData(search) {
  const { ingredients, menuMasters, mapData, baseMapData, edges, toppings, loading } =
    useAllergenSourceData();
  const {
    menuOrder,
    allergenOrder,
    menuNameOverrides,
    applyMenuOrder,
    applyAllergenOrder,
    resetOrder,
    applyMenuNameOverrides,
  } = useAllergenOrderState();
  const [detailRow, setDetailRow] = useState(null);

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

  const ingredientByKey = useMemo(
    () => buildIngredientByKey(allergenIngredients),
    [allergenIngredients]
  );

  const detailRows = useMemo(
    () => buildDetailRows(detailRow, baseMapData, edges, ingredientByKey),
    [baseMapData, detailRow, edges, ingredientByKey]
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

  const totalWithAllergen = allergenIngredients.length;
  const totalIngredients = asObjectArray(ingredients).filter(
    i => !i.discontinued && !i.excluded
  ).length;

  const exportCsv = useCallback(() => {
    downloadCsv(buildAllergenCsvRows(menuMatrix, orderedAllergens), '알레르기매트릭스.csv');
  }, [menuMatrix, orderedAllergens]);

  return {
    loading,
    mapData,
    ingredientRows,
    isExcludedMenu,
    menuMatrix,
    orderedAllergens,
    detailRow,
    setDetailRow,
    detailRows,
    menuOrder,
    allergenOrder,
    menuNameOverrides,
    menuListForOrder,
    allergenListForOrder,
    menuNameEditMenus,
    totalWithAllergen,
    totalIngredients,
    exportCsv,
    applyMenuOrder,
    applyAllergenOrder,
    resetOrder,
    applyMenuNameOverrides,
  };
}
