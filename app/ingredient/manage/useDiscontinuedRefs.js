'use client';
import { useEffect, useState } from 'react';
import { getAllMenuRecipes } from '@/lib/menu-recipes';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllEdges } from '@/lib/cost/edge-dough';
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

  const hasFlaggedRow = (rows || []).some(
    r => (r?.discontinued === true || r?.excluded === true) && r?.productCode
  );

  useEffect(() => {
    if (!hasFlaggedRow) {
      setRefs([]);
      return;
    }
    let alive = true;
    setLoading(true);
    Promise.all([getAllMenuRecipes(), getAllRecipeGroups(), getAllEdges()])
      .then(([menuRecipes, recipeGroups, edges]) => {
        if (!alive) return;
        setRefs(
          collectDiscontinuedIngredientRefs({ ingredients: rows, menuRecipes, recipeGroups, edges })
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
  }, [rows, hasFlaggedRow, refreshKey]);

  return { refs, loading, error };
}
