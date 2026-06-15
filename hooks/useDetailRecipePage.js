'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { initDB } from '@/lib/db';
import { getAllMenuPrices } from '@/lib/cost/menu-price';
import { showToast } from '@/components/Toast';
import { loadLatestUnitPriceMap, summarizeMenuRecipe } from '@/lib/menu-master/recipe-summary';

/**
 * 원가 세부 페이지 공통 로직 훅 (pizza / side / set / personal).
 *
 * 4개 페이지가 85% 동일한 state + load + handleSave + stats + summaryRows를
 * config 파라미터로 추상화. 각 페이지는 thin shell이 된다.
 *
 * @param {{
 *   category:       string,               // 필터링 카테고리 ('사이드'|'피자'|'세트박스'|'1인피자')
 *   fetchRecipeMap: () => Promise<Map>,   // getXxxRecipeMap
 *   upsertRecipe:   (data:object) => Promise<{mode:string}>,
 *   extraFetch?:    () => Promise<any>,   // 선택 — 피자의 getAllEdges 등
 * }}
 * @returns {{
 *   tab, setTab,
 *   menus, recipeMap,
 *   loading, dbError,
 *   target, setTarget,
 *   handleSave,
 *   stats: { withRecipe, totalCost },
 *   summaryRows,
 *   extraData,        // extraFetch 결과 (피자: edges)
 * }}
 */
export function useDetailRecipePage({ category, fetchRecipeMap, upsertRecipe, extraFetch }) {
  const [tab, setTab] = useState('detail');
  const [menus, setMenus] = useState([]);
  const [recipeMap, setRecipeMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [target, setTarget] = useState(null);
  const [extraData, setExtraData] = useState(null);
  const [unitPriceMap, setUnitPriceMap] = useState(new Map());
  const mountedRef = useMounted();

  const load = useCallback(async () => {
    await initDB();
    const [allMenus, recMap, latestUnitPriceMap, extra] = await Promise.all([
      getAllMenuPrices(),
      fetchRecipeMap(),
      loadLatestUnitPriceMap(),
      extraFetch ? extraFetch() : Promise.resolve(undefined),
    ]);
    if (!mountedRef.current) return;
    setMenus(allMenus.filter(m => m.category === category));
    setRecipeMap(recMap);
    setUnitPriceMap(latestUnitPriceMap);
    if (extra !== undefined) setExtraData(extra);
    // extraFetch는 모듈 레벨 함수라 안정적이나, eslint 경고 방지를 위해 포함
  }, [category, fetchRecipeMap, extraFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
      .catch(err => {
        if (!mountedRef.current) return;
        console.error(err);
        setDbError(err.message || '데이터 로드 실패');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, [load, mountedRef]);

  async function handleSave(data) {
    try {
      const result = await upsertRecipe(data);
      const msg =
        result.mode === 'insert'
          ? '레시피 등록 완료'
          : !data.id
            ? '기존 레시피 덮어씌움'
            : '레시피 수정 완료';
      showToast(msg, 'ok');
      setTarget(null);
      await load(); // menus·recipeMap 동시 갱신 (신규 메뉴가 추가됐을 수 있음)
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'err');
      throw err;
    }
  }

  const stats = useMemo(() => {
    let withRecipe = 0;
    let totalCost = 0;
    for (const m of menus) {
      const r = recipeMap.get(m.menuCode);
      if (r && r.components?.length > 0) {
        const cost = summarizeMenuRecipe(m, r, unitPriceMap).totalCost;
        withRecipe++;
        totalCost += cost;
      }
    }
    return { withRecipe, totalCost };
  }, [menus, recipeMap, unitPriceMap]);

  const summaryRows = useMemo(
    () =>
      menus.map(m => {
        const recipe = recipeMap.get(m.menuCode) ?? null;
        const cost = recipe ? summarizeMenuRecipe(m, recipe, unitPriceMap).totalCost : 0;
        const rate = m.price && cost > 0 ? (cost / m.price) * 100 : null;
        return { menuCode: m.menuCode, menuName: m.menuName, price: m.price, cost, rate };
      }),
    [menus, recipeMap, unitPriceMap]
  );

  return {
    tab,
    setTab,
    menus,
    recipeMap,
    loading,
    dbError,
    target,
    setTarget,
    handleSave,
    stats,
    summaryRows,
    extraData,
    unitPriceMap,
    reload: load,
  };
}
