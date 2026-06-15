'use client';
import { useState, useCallback } from 'react';
import { downloadCsv } from '@/lib/download';
import { buildAllergenCsvRows } from './allergenPageOutputUtils';
import { useAllergenDerivedData } from './useAllergenDerivedData';
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

  const derivedData = useAllergenDerivedData({
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
  });

  const exportCsv = useCallback(() => {
    downloadCsv(
      buildAllergenCsvRows(derivedData.menuMatrix, derivedData.orderedAllergens),
      '알레르기매트릭스.csv'
    );
  }, [derivedData.menuMatrix, derivedData.orderedAllergens]);

  return {
    loading,
    mapData,
    detailRow,
    setDetailRow,
    menuOrder,
    allergenOrder,
    menuNameOverrides,
    ...derivedData,
    exportCsv,
    applyMenuOrder,
    applyAllergenOrder,
    resetOrder,
    applyMenuNameOverrides,
  };
}
