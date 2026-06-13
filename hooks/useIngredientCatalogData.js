import { useEffect, useState, useMemo, useCallback } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { initDB } from '@/lib/db';
import { showToast } from '@/components/Toast';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import {
  getAllIngredients,
  getIngredientMetaMap,
  mergeIngredientRows,
  sortMainCategories,
  sortHashTags,
  buildMetaOnlyRow,
  buildProductTypeMap,
} from '@/lib/ingredient';
import { getManagedProducts, seedManagedProductsIfEmpty } from '@/lib/shipment';
import { SCOPE } from '@/lib/ingredient/constants';

export function useIngredientCatalogData() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useMounted();

  const load = useCallback(async () => {
    await initDB();
    const files = await getPriceFiles();
    const latest = files[0] || null;

    const [allMeta, metaMap, managed] = await Promise.all([
      getAllIngredients(),
      getIngredientMetaMap(),
      seedManagedProductsIfEmpty().then(() => getManagedProducts()),
    ]);
    if (!mountedRef.current) return;
    const typeMap = buildProductTypeMap(managed);

    if (!latest) {
      setRows(allMeta.filter(m => m.isManual || m.isSeeded).map(buildMetaOnlyRow));
      return;
    }

    const priceRows = await getPriceRowsByFileId(latest.id);
    if (!mountedRef.current) return;
    const merged = mergeIngredientRows(priceRows, metaMap, typeMap).filter(r => r.hasRecord);
    const priceCodeSet = new Set(priceRows.map(r => r.productCode).filter(Boolean));
    const orphanRows = allMeta
      .filter(
        m => (m.isManual || m.isSeeded) && (!m.productCode || !priceCodeSet.has(m.productCode))
      )
      .map(buildMetaOnlyRow);

    setRows([...merged, ...orphanRows]);
  }, [mountedRef]);

  useEffect(() => {
    load()
      .catch(err => {
        if (mountedRef.current) {
          console.error(err);
          showToast('데이터 로드 실패: ' + err.message, 'error');
        }
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [load, mountedRef]);

  const {
    active,
    totalCount,
    exclusiveCnt,
    generalCnt,
    generalMgtCnt,
    linkedCount,
    discontinuedCount,
    linkPct,
  } = useMemo(() => {
    const active = rows.filter(r => !r.discontinued && !r.excluded);
    const totalCount = active.length;
    const exclusiveCnt = active.filter(r => r.scope === SCOPE.EXCLUSIVE).length;
    const generalCnt = active.filter(r => r.scope === SCOPE.GENERIC).length;
    const generalMgtCnt = active.filter(r => r.scope === SCOPE.GENERIC_MANAGED).length;
    const linkedCount = active.filter(r => r.jetteLinked).length;
    const discontinuedCount = rows.filter(r => r.discontinued).length;
    const linkPct = totalCount > 0 ? Math.round((linkedCount / totalCount) * 100) : 0;
    return {
      active,
      totalCount,
      exclusiveCnt,
      generalCnt,
      generalMgtCnt,
      linkedCount,
      discontinuedCount,
      linkPct,
    };
  }, [rows]);

  const mainCats = useMemo(() => {
    const set = new Set();
    rows.forEach(r => {
      if (!r.discontinued && !r.excluded && r.category) set.add(r.category);
    });
    return sortMainCategories(Array.from(set));
  }, [rows]);

  const hashTags = useMemo(() => {
    const set = new Set();
    rows.forEach(r => {
      if (r.discontinued || r.excluded) return;
      (r.tags || []).forEach(t => t && set.add(t));
    });
    return sortHashTags(Array.from(set));
  }, [rows]);

  const uncategorizedCount = useMemo(
    () => rows.filter(r => !r.discontinued && !r.excluded && !r.category).length,
    [rows]
  );

  return {
    rows,
    loading,
    reload: load,
    active,
    totalCount,
    exclusiveCnt,
    generalCnt,
    generalMgtCnt,
    linkedCount,
    discontinuedCount,
    linkPct,
    mainCats,
    hashTags,
    uncategorizedCount,
  };
}
