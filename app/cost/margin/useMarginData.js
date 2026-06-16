'use client';
import { useState, useCallback, useEffect } from 'react';
import { initDB } from '@/lib/db';
import { buildPriceRowMap, getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import { buildUnitPriceMap } from '@/lib/recipe';
import { getAllMenuPrices } from '@/lib/cost/menu-price';
import { PIZZA_CATEGORY_VARIANTS, getMenuCodeRank } from '@/lib/menu-categories';
import { getMenuMasterMap } from '@/lib/menu-master';
import { loadPlatforms } from '@/lib/cost/margin/platforms';
import { getAllEdges } from '@/lib/cost/edge-dough/store';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { loadMenuRecipeMaps } from '@/lib/menu-recipes';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { onPriceUpload } from '@/lib/price/price-events';
import { buildDetailRows, buildEdgeMetadata, buildDerivedRows } from '@/lib/cost/margin/build-rows';

/**
 * 원가마진표 데이터 로드 훅.
 * rows, platforms 상태와 load 콜백을 반환.
 */
export function useMarginData() {
  const [rows, setRows] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  const load = useCallback(async () => {
    await initDB();
    const [files, meta, allMenuPrices, recipeMaps, edges, masterByCode, recipeGroups] =
      await Promise.all([
        getPriceFiles(),
        getAllIngredients(),
        getAllMenuPrices(),
        loadMenuRecipeMaps(),
        getAllEdges(),
        getMenuMasterMap(),
        getAllRecipeGroups(),
      ]);

    const latest = files[0] || null;
    let priceRowMap = new Map();
    if (latest) {
      const priceRows = await getPriceRowsByFileId(latest.id);
      priceRowMap = buildPriceRowMap(priceRows).map;
    }
    const upm = buildUnitPriceMap(meta, priceRowMap);

    const detailRows = buildDetailRows(
      allMenuPrices,
      {
        pizzaMap: recipeMaps.pizza,
        personalMap: recipeMaps.personal,
        sideMap: recipeMaps.side,
        setMap: recipeMaps.set,
      },
      upm,
      recipeGroups
    );

    const detailKeySet = new Set(detailRows.map(r => `${r.menuName}||${r.menuCategory}`));
    const PIZZA_EDGE_CATS = new Set(PIZZA_CATEGORY_VARIANTS);
    const pizzaSources = detailRows.filter(r => PIZZA_EDGE_CATS.has(r.menuCategory || ''));

    const edgeMeta = buildEdgeMetadata(edges, allMenuPrices);
    const derivedRows = buildDerivedRows(pizzaSources, edgeMeta, detailKeySet);

    const allRows = [...detailRows, ...derivedRows];
    for (const r of allRows) {
      const m = r.menuCode ? masterByCode.get(r.menuCode) : null;
      r.hidden = m?.hidden === true;
    }
    allRows.sort((a, b) => {
      const ra = getMenuCodeRank(a.menuCode);
      const rb = getMenuCodeRank(b.menuCode);
      if (ra !== rb) return ra - rb;
      return (a.menuName || '').localeCompare(b.menuName || '', 'ko');
    });
    setRows(allRows);
    setPlatforms(loadPlatforms());
  }, []);

  useEffect(() => {
    load()
      .catch(err => {
        console.error('[CostMargin] load failed', err);
        setDbError(err.message || '데이터 로드 실패');
      })
      .finally(() => setLoading(false));
  }, [load]);

  useVisibilityRefresh(load);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onPriceUpload(load), [load]);

  return { rows, setRows, platforms, setPlatforms, loading, dbError, load };
}
