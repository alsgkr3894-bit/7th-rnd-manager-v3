'use client';
import { useEffect, useState } from 'react';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { buildIngredientUsageRows, ingredientUsageIdentity } from '@/lib/ingredient/usage-summary';
import { getAllMenuMaster } from '@/lib/menu-master/store';
import { getAllMenuRecipes } from '@/lib/menu-recipes';
import { getAllCompositions } from '@/lib/nutrition/values/store';

const EMPTY_STATE = { loading: false, rows: [], error: null };

export function useIngredientUsageSummary(ingredient) {
  const [state, setState] = useState(EMPTY_STATE);

  useEffect(() => {
    const identity = ingredientUsageIdentity(ingredient);
    if (!identity.productCode && !identity.ingredientName) {
      setState(EMPTY_STATE);
      return undefined;
    }

    let cancelled = false;
    setState(prev => ({ ...prev, loading: true, error: null }));

    Promise.all([
      getAllMenuMaster(),
      getAllMenuRecipes(),
      getAllRecipeGroups(),
      getAllEdges(),
      getAllCompositions(),
    ])
      .then(([menuMasters, recipes, groups, edges, compositions]) => {
        if (cancelled) return;
        const { ingredientToMenus } = buildIngredientMenuMap({
          menuMasters,
          detailRecipes: recipes,
          groups,
          edges,
          compositions,
        });
        setState({
          loading: false,
          rows: buildIngredientUsageRows({ ingredientToMenus, ...identity }),
          error: null,
        });
      })
      .catch(err => {
        if (!cancelled) {
          setState({
            loading: false,
            rows: [],
            error: err?.message || '사용 메뉴를 불러오지 못했습니다.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ingredient]);

  return state;
}
