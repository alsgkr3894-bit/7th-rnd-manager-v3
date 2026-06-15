'use client';
import { useState, useCallback, useEffect } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { getAllToppings, getAllCompositions } from '@/lib/nutrition/values/store';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { loadMenuRecipeArrays } from '@/lib/menu-recipes';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import { asObjectArray } from '@/lib/ui/prop-guards';
import { migrateNutritionToIngredients } from '@/lib/nutrition/migrate-to-ingredient';

function createEmptyMenuMap() {
  return {
    ingredientToMenus: new Map(),
    menuToIngredients: new Map(),
  };
}

export function useAllergenSourceData() {
  const [ingredients, setIngredients] = useState([]);
  const [menuMasters, setMenuMasters] = useState([]);
  const [mapData, setMapData] = useState(createEmptyMenuMap);
  const [baseMapData, setBaseMapData] = useState(createEmptyMenuMap);
  const [edges, setEdges] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useMounted();

  const load = useCallback(async () => {
    await initDB();
    await migrateNutritionToIngredients().catch(e =>
      console.warn('[nutrition/allergen] 마이그레이션 실패', e)
    );
    const [ings, masters, groups, edges, toppingList, recipeArrays, compositions] =
      await Promise.all([
        getAllIngredients(),
        getAllMenuMaster(),
        getAllRecipeGroups(),
        getAllEdges(),
        getAllToppings(),
        loadMenuRecipeArrays(),
        getAllCompositions(),
      ]);
    if (!mountedRef.current) return;

    const safeIngredients = asObjectArray(ings);
    const safeMenuMasters = asObjectArray(masters);
    const safeGroups = asObjectArray(groups);
    const safeEdges = asObjectArray(edges);
    const safeCompositions = asObjectArray(compositions);
    const detailRecipes = tagDetailRecipes(
      asObjectArray(recipeArrays.pizza),
      asObjectArray(recipeArrays.personal),
      asObjectArray(recipeArrays.side),
      asObjectArray(recipeArrays.set)
    );

    setIngredients(safeIngredients);
    setMenuMasters(safeMenuMasters);
    setEdges(safeEdges);
    setToppings(asObjectArray(toppingList));
    setMapData(
      buildIngredientMenuMap({
        menuMasters: safeMenuMasters,
        detailRecipes,
        groups: safeGroups,
        edges: safeEdges,
        compositions: safeCompositions,
      })
    );
    setBaseMapData(
      buildIngredientMenuMap({
        menuMasters: safeMenuMasters,
        detailRecipes,
        groups: safeGroups,
        edges: [],
        compositions: safeCompositions,
      })
    );
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

  useVisibilityRefresh(load);

  return {
    ingredients,
    menuMasters,
    mapData,
    baseMapData,
    edges,
    toppings,
    loading,
  };
}
