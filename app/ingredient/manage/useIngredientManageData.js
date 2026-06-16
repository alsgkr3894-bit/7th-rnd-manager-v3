'use client';

import { useCallback, useEffect, useState } from 'react';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { initDB } from '@/lib/db';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getManagedProducts, seedManagedProductsIfEmpty } from '@/lib/shipment';
import {
  buildMetaOnlyRow,
  getAllIngredients,
  getIngredientMetaMap,
  getIngredientProductCodeDuplicateDiagnostics,
  mergeIngredientRows,
} from '@/lib/ingredient';
import { migrateNutritionToIngredients } from '@/lib/nutrition/migrate-to-ingredient';

function findBrokenCompositeRefs(allMeta) {
  const codeSet = new Set(allMeta.filter(m => m.productCode).map(m => m.productCode));
  return allMeta.filter(
    m =>
      Array.isArray(m.compositeOf) &&
      m.compositeOf.length > 0 &&
      m.compositeOf.some(code => code && !codeSet.has(code))
  );
}

export function useIngredientManageData() {
  const [rows, setRows] = useState([]);
  const [prevPriceMap, setPrevPriceMap] = useState(null);
  const [priceDate, setPriceDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [brokenRefs, setBrokenRefs] = useState([]);
  const [productCodeDupes, setProductCodeDupes] = useState(null);
  const [newJetteRows, setNewJetteRows] = useState([]);
  const [jetteRemovedRows, setJetteRemovedRows] = useState([]);
  const [latestPriceRows, setLatestPriceRows] = useState([]);

  const load = useCallback(async () => {
    await initDB();
    await migrateNutritionToIngredients().catch(error =>
      console.warn('[ingredient/manage] 마이그레이션 실패', error)
    );

    const files = await getPriceFiles();
    const latest = files[0] || null;
    const prev = files[1] ?? null;
    setPriceDate(latest?.updateDate || null);

    const [allMeta, metaMap, managed, productCodeDiagnostics] = await Promise.all([
      getAllIngredients(),
      getIngredientMetaMap(),
      seedManagedProductsIfEmpty().then(() => getManagedProducts()),
      getIngredientProductCodeDuplicateDiagnostics(),
    ]);
    setProductCodeDupes(productCodeDiagnostics);

    const typeMap = new Map(
      managed
        .filter(product => product.productCode)
        .map(product => [product.productCode, product.productType])
    );

    if (!latest) {
      setPrevPriceMap(null);
      setNewJetteRows([]);
      setJetteRemovedRows([]);
      setLatestPriceRows([]);
      setRows(allMeta.filter(meta => meta.isManual || meta.isSeeded).map(buildMetaOnlyRow));
      setBrokenRefs(findBrokenCompositeRefs(allMeta));
      return;
    }

    const priceRows = await getPriceRowsByFileId(latest.id);
    setLatestPriceRows(priceRows);
    const allMerged = mergeIngredientRows(priceRows, metaMap, typeMap);
    const merged = allMerged.filter(row => row.hasRecord);
    const priceCodeSet = new Set(priceRows.map(row => row.productCode).filter(Boolean));
    const orphanMetaRows = allMeta
      .filter(
        meta =>
          (meta.isManual || meta.isSeeded) &&
          (!meta.productCode || !priceCodeSet.has(meta.productCode))
      )
      .map(buildMetaOnlyRow);

    // 제때 신규 미등록 항목 (최신 파일에 있지만 식자재 메타 없음)
    setNewJetteRows(allMerged.filter(row => !row.hasRecord));

    if (prev) {
      const prevRows = await getPriceRowsByFileId(prev.id);
      setPrevPriceMap(new Map(prevRows.map(row => [row.productCode, row.priceWithTax])));
      // 제때에서 제거된 항목 (이전 파일에 있었으나 최신 파일에서 사라짐 + 메타 존재)
      const prevCodeSet = new Set(prevRows.map(row => row.productCode).filter(Boolean));
      const removedWithMeta = [...prevCodeSet]
        .filter(c => c && !priceCodeSet.has(c))
        .map(c => metaMap.get(c))
        .filter(Boolean)
        .map(buildMetaOnlyRow);
      setJetteRemovedRows(removedWithMeta);
    } else {
      setPrevPriceMap(null);
      setJetteRemovedRows([]);
    }

    setRows([...merged, ...orphanMetaRows]);
    setBrokenRefs(findBrokenCompositeRefs(allMeta));
  }, []);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  useVisibilityRefresh(load);

  return {
    rows,
    setRows,
    prevPriceMap,
    priceDate,
    loading,
    load,
    brokenRefs,
    productCodeDupes,
    newJetteRows,
    jetteRemovedRows,
    latestPriceRows,
  };
}
