import { useState, useEffect, useCallback } from 'react';
import { initDB } from '@/lib/db';
import { buildPriceRowMap, getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllRecipes, buildUnitPriceMap } from '@/lib/recipe';
import { getAllMenuMaster } from '@/lib/menu-master/store';
import { normalizePersonalPizzaCodes } from '@/lib/menu-master/normalize';
import { getAllMenuPrices } from '@/lib/cost/menu-price/store';
import { parseMenuCode } from '@/lib/cost/menu-price/code';
import { getMenuCodeBase } from '@/lib/menu-master/code-policy';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';

export function useRecipeWorkbenchData() {
  const [recipes, setRecipes] = useState([]);
  const [allMeta, setAllMeta] = useState([]);
  const [menuMasters, setMenuMasters] = useState([]);
  const [unitPriceMap, setUnitPriceMap] = useState(new Map());
  const [menuPricesMap, setMenuPricesMap] = useState(new Map());
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  const reload = useCallback(async () => {
    await initDB();
    await normalizePersonalPizzaCodes().catch(e => console.warn('[recipe] 코드 정규화 실패', e));
    const [files, meta, recs, masters, menuPrices, groups] = await Promise.all([
      getPriceFiles(),
      getAllIngredients(),
      getAllRecipes(),
      getAllMenuMaster(),
      getAllMenuPrices(),
      getAllRecipeGroups(),
    ]);
    const latest = files[0] || null;
    let priceRowMap = new Map();
    if (latest) {
      const rows = await getPriceRowsByFileId(latest.id);
      priceRowMap = buildPriceRowMap(rows).map;
    }
    const pmap = new Map();
    for (const p of menuPrices) {
      const parsed = parseMenuCode(p.menuCode);
      const fullCode = String(p.menuCode || '').trim();
      const policyBase = getMenuCodeBase({ menuCode: p.menuCode, size: p.size });
      const parsedBase = parsed ? `${parsed.prefix}-${String(parsed.base).padStart(3, '0')}` : '';
      const base = policyBase && policyBase !== fullCode ? policyBase : parsedBase || fullCode;
      if (!pmap.has(base)) pmap.set(base, {});
      pmap.get(base)[p.size] = p.price;
    }
    setAllMeta(meta);
    setMenuMasters(masters);
    setMenuPricesMap(pmap);
    setUnitPriceMap(buildUnitPriceMap(meta, priceRowMap));
    setRecipes(recs);
    setAllGroups(groups);
  }, []);

  useEffect(() => {
    reload()
      .catch(err => {
        console.error(err);
        setDbError(err.message || '데이터 로드 실패');
      })
      .finally(() => setLoading(false));
  }, [reload]);

  return {
    recipes,
    allMeta,
    menuMasters,
    unitPriceMap,
    menuPricesMap,
    allGroups,
    loading,
    dbError,
    reload,
  };
}
