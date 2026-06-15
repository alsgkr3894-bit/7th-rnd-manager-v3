import { useEffect, useState, useCallback } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { initDB } from '@/lib/db';
import { buildPriceRowMap, getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients, getIngredientMetaMap, buildProductTypeMap } from '@/lib/ingredient';
import { getManagedProducts, seedManagedProductsIfEmpty } from '@/lib/shipment';
import { buildIngredientPriceRows } from '@/lib/cost/ingredient-price/buildRows';

export function useIngredientPriceData() {
  const [rows, setRows] = useState([]);
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const mountedRef = useMounted();

  const load = useCallback(async () => {
    await initDB();
    const files = await getPriceFiles();
    const latest = files[0] || null;
    const prev = files[1] || null;

    const [allMeta, metaMap, managed] = await Promise.all([
      getAllIngredients(),
      getIngredientMetaMap(),
      seedManagedProductsIfEmpty().then(() => getManagedProducts()),
    ]);
    if (!mountedRef.current) return;
    const typeMap = buildProductTypeMap(managed);

    if (!allMeta.length) {
      setRows([]);
    }

    let prevPriceMap = new Map();
    let priceRows = [];
    let priceCodeSet = new Set();

    if (latest) {
      setFileInfo({
        name: latest.fileName || latest.name || '',
        date: latest.updateDate || latest.date || '',
      });
      const [latestRows, prevRows] = await Promise.all([
        getPriceRowsByFileId(latest.id),
        prev ? getPriceRowsByFileId(prev.id) : Promise.resolve([]),
      ]);
      if (!mountedRef.current) return;
      const latestPrice = buildPriceRowMap(latestRows);
      const prevPrice = buildPriceRowMap(prevRows);
      priceRows = latestPrice.rows;
      priceCodeSet = new Set(priceRows.map(r => r.productCode).filter(Boolean));
      if (prev) {
        prevPrice.rows.forEach(r => {
          if (r.productCode) prevPriceMap.set(r.productCode, r.priceWithTax);
        });
      }
    }

    const priceRowMap = buildPriceRowMap(priceRows).map;
    if (!mountedRef.current) return;
    setRows(
      buildIngredientPriceRows(allMeta, priceRowMap, prevPriceMap, prev, priceCodeSet, typeMap)
    );
  }, [mountedRef]);

  useEffect(() => {
    load()
      .catch(err => {
        if (!mountedRef.current) return;
        console.error('[useIngredientPriceData] load failed', err);
        setDbError(err.message || '데이터 로드 실패');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [load, mountedRef]);

  useVisibilityRefresh(load);

  return { rows, fileInfo, loading, dbError, reload: load };
}
