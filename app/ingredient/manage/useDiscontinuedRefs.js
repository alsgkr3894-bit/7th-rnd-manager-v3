'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAllMenuRecipes } from '@/lib/menu-recipes';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { getAllMenuMaster } from '@/lib/menu-master';
import { collectDiscontinuedIngredientRefs } from '@/lib/ingredient/discontinued-refs';

/**
 * "단종/숨김 식자재를 아직 참조하는 레시피" 진단 배너용 데이터.
 * 단종/숨김 처리된 식자재가 하나도 없으면 레시피/세트그룹/엣지를 읽지 않는다 —
 * 관리 화면 기본 로드(useIngredientManageData)에 이 3개 스토어를 더 얹지 않기 위해서다.
 * @param {object[]} rows 식자재 관리 목록 행
 * @param {*} refreshKey rows가 바뀌지 않아도 다시 읽고 싶을 때(priceDate 등) 바꿔주는 키
 */
export function useDiscontinuedRefs(rows, refreshKey) {
  const [refs, setRefs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // 최신 rows를 effect가 재실행되지 않아도 읽을 수 있도록 ref로 들고 있는다.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  // 가격확인·카테고리변경 등 무관한 수정마다 setRows가 rows를 새 배열로 만든다 — rows
  // 자체를 deps로 쓰면 단종/숨김 항목이 하나라도 있는 한(실사용에선 거의 항상) 그때마다
  // 레시피/세트그룹/엣지 3개 스토어를 통째로 다시 읽는다. 단종/숨김 productCode 집합이
  // 실제로 바뀔 때만 재조회하도록 짧은 키로 축약한다.
  const flaggedKey = useMemo(
    () =>
      (rows || [])
        .filter(r => (r?.discontinued === true || r?.excluded === true) && r?.productCode)
        .map(r => r.productCode)
        .sort()
        .join(','),
    [rows]
  );

  useEffect(() => {
    if (!flaggedKey) {
      setRefs([]);
      return;
    }
    let alive = true;
    setLoading(true);
    Promise.all([getAllMenuRecipes(), getAllRecipeGroups(), getAllEdges(), getAllMenuMaster()])
      .then(([menuRecipes, recipeGroups, edges, menuMasters]) => {
        if (!alive) return;
        setRefs(
          collectDiscontinuedIngredientRefs({
            ingredients: rowsRef.current,
            menuRecipes,
            recipeGroups,
            edges,
            menuMasters,
          })
        );
        setError(null);
      })
      .catch(err => {
        if (!alive) return;
        setRefs([]);
        setError(err instanceof Error ? err.message : '진단 데이터를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [flaggedKey, refreshKey]);

  return { refs, loading, error };
}
