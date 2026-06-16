'use client';

import { useState, useEffect } from 'react';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { useDBLoad } from '@/hooks/useDBLoad';
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
  // 로컬 rows 상태 — useIngredientManageActions의 낙관적 업데이트(setRows)가 직접 조작함
  const [rows, setRows] = useState([]);

  const { data, loading, reload } = useDBLoad(
    async () => {
      await migrateNutritionToIngredients().catch(error =>
        console.warn('[ingredient/manage] 마이그레이션 실패', error)
      );

      const files = await getPriceFiles();
      const latest = files[0] || null;
      const prev = files[1] ?? null;
      const priceDate = latest?.updateDate || null;

      const [allMeta, metaMap, managed, productCodeDupes] = await Promise.all([
        getAllIngredients(),
        getIngredientMetaMap(),
        seedManagedProductsIfEmpty().then(() => getManagedProducts()),
        getIngredientProductCodeDuplicateDiagnostics(),
      ]);

      const typeMap = new Map(
        managed
          .filter(product => product.productCode)
          .map(product => [product.productCode, product.productType])
      );

      if (!latest) {
        return {
          rows: allMeta.filter(meta => meta.isManual || meta.isSeeded).map(buildMetaOnlyRow),
          prevPriceMap: null,
          priceDate,
          brokenRefs: findBrokenCompositeRefs(allMeta),
          productCodeDupes,
          newJetteRows: [],
          jetteRemovedRows: [],
          latestPriceRows: [],
        };
      }

      const priceRows = await getPriceRowsByFileId(latest.id);
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

      let prevPriceMap = null;
      let jetteRemovedRows = [];
      if (prev) {
        const prevRows = await getPriceRowsByFileId(prev.id);
        prevPriceMap = new Map(prevRows.map(row => [row.productCode, row.priceWithTax]));
        const prevCodeSet = new Set(prevRows.map(row => row.productCode).filter(Boolean));
        jetteRemovedRows = [...prevCodeSet]
          .filter(c => c && !priceCodeSet.has(c))
          .map(c => metaMap.get(c))
          .filter(Boolean)
          .map(buildMetaOnlyRow);
      }

      return {
        rows: [...merged, ...orphanMetaRows],
        prevPriceMap,
        priceDate,
        brokenRefs: findBrokenCompositeRefs(allMeta),
        productCodeDupes,
        newJetteRows: allMerged.filter(row => !row.hasRecord),
        jetteRemovedRows,
        latestPriceRows: priceRows,
      };
    },
    { initialData: null, onError: err => console.error('[ingredient/manage] 로드 실패', err) }
  );

  // DB 데이터가 갱신되면 로컬 rows 동기화 (낙관적 업데이트 이후 덮어씀)
  useEffect(() => {
    if (data?.rows !== undefined) setRows(data.rows);
  }, [data?.rows]);

  useVisibilityRefresh(reload);

  return {
    rows,
    setRows,
    prevPriceMap: data?.prevPriceMap ?? null,
    priceDate: data?.priceDate ?? null,
    loading,
    load: reload,
    brokenRefs: data?.brokenRefs ?? [],
    productCodeDupes: data?.productCodeDupes ?? null,
    newJetteRows: data?.newJetteRows ?? [],
    jetteRemovedRows: data?.jetteRemovedRows ?? [],
    latestPriceRows: data?.latestPriceRows ?? [],
  };
}
