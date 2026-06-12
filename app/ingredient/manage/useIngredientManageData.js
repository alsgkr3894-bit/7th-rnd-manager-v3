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
      setRows(allMeta.filter(meta => meta.isManual || meta.isSeeded).map(buildMetaOnlyRow));
      setBrokenRefs(findBrokenCompositeRefs(allMeta));
      return;
    }

    const priceRows = await getPriceRowsByFileId(latest.id);
    const merged = mergeIngredientRows(priceRows, metaMap, typeMap).filter(row => row.hasRecord);
    const priceCodeSet = new Set(priceRows.map(row => row.productCode).filter(Boolean));
    const orphanMetaRows = allMeta
      .filter(
        meta =>
          (meta.isManual || meta.isSeeded) &&
          (!meta.productCode || !priceCodeSet.has(meta.productCode))
      )
      .map(buildMetaOnlyRow);

    if (prev) {
      const prevRows = await getPriceRowsByFileId(prev.id);
      setPrevPriceMap(new Map(prevRows.map(row => [row.productCode, row.priceWithTax])));
    } else {
      setPrevPriceMap(null);
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
  };
}
