'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { eligibleRecipeGroupsForMenu } from '@/lib/cost/recipe-groups/effective';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { loadLatestUnitPriceMap, summarizeMenuRecipe } from '@/lib/menu-master/recipe-summary';
import {
  getMenuRecipeForMenu,
  normalizeSelectedRecipeGroupIds,
  upsertMenuRecipeForMenu,
} from '@/lib/menu-recipes';
import { recipeStoreKindForCategory } from '@/lib/recipe-master/sync';
import {
  buildRecipeComponentForSave,
  createBlankRecipeComponentRow,
  hydrateRecipeComponent,
} from '@/components/menu-master/recipeComponentRows';

export function useMenuRecipeEditor({ menuCode, menuName, category, size, sellingPrice, onSaved }) {
  const [components, setComponents] = useState([]);
  const [selectedRecipeGroupIds, setSelectedRecipeGroupIds] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allIngredients, setAllIngredients] = useState([]);
  const [recipeGroups, setRecipeGroups] = useState([]);
  const [unitPriceMap, setUnitPriceMap] = useState(new Map());

  const recipeKind = recipeStoreKindForCategory(category);
  const supported = Boolean(recipeKind && menuCode);

  useEffect(() => {
    setLoaded(false);
    setComponents([]);
    setSelectedRecipeGroupIds([]);
    setAllIngredients([]);
    setRecipeGroups([]);
    setUnitPriceMap(new Map());
    if (!supported) return;
    let ignore = false;
    initDB().then(async () => {
      const [existing, ingredients, latestUnitPriceMap, groups] = await Promise.all([
        getMenuRecipeForMenu({ menuCode, menuName, category, size }),
        getAllIngredients(),
        loadLatestUnitPriceMap(),
        getAllRecipeGroups(),
      ]);
      if (ignore) return;
      setComponents(
        existing?.components?.length
          ? existing.components.map(c => hydrateRecipeComponent(c, latestUnitPriceMap))
          : []
      );
      setSelectedRecipeGroupIds(normalizeSelectedRecipeGroupIds(existing?.selectedRecipeGroupIds));
      setAllIngredients(ingredients);
      setRecipeGroups(groups);
      setUnitPriceMap(latestUnitPriceMap);
      setLoaded(true);
    });
    return () => {
      ignore = true;
    };
    // api functions are stable module-level imports, category/menuCode cover the relevant deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuCode, category]);

  const updateRow = useCallback((idx, field, val) => {
    setComponents(prev => prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
  }, []);

  const removeRow = useCallback(idx => {
    setComponents(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const addRow = useCallback(() => {
    setComponents(prev => [...prev, createBlankRecipeComponentRow()]);
  }, []);

  const eligibleRecipeGroups = useMemo(
    () => eligibleRecipeGroupsForMenu({ menuCode, category, size }, recipeGroups),
    [category, menuCode, recipeGroups, size]
  );

  const eligibleRecipeGroupIds = useMemo(
    () => new Set(eligibleRecipeGroups.map(group => String(group.id ?? '').trim()).filter(Boolean)),
    [eligibleRecipeGroups]
  );

  const toggleRecipeGroup = useCallback(groupId => {
    const id = String(groupId ?? '').trim();
    if (!id) return;
    setSelectedRecipeGroupIds(prev =>
      prev.includes(id) ? prev.filter(value => value !== id) : [...prev, id]
    );
  }, []);

  const savableRecipeGroupIds = useMemo(
    () => selectedRecipeGroupIds.filter(id => eligibleRecipeGroupIds.has(id)),
    [eligibleRecipeGroupIds, selectedRecipeGroupIds]
  );

  const recipeSummary = useMemo(
    () =>
      summarizeMenuRecipe(
        { menuCode, category, size, price: sellingPrice },
        { components, selectedRecipeGroupIds: savableRecipeGroupIds },
        unitPriceMap,
        { recipeGroups }
      ),
    [
      category,
      components,
      menuCode,
      recipeGroups,
      savableRecipeGroupIds,
      sellingPrice,
      size,
      unitPriceMap,
    ]
  );

  const handleSave = useCallback(async () => {
    if (!supported) return;
    setSaving(true);
    try {
      await upsertMenuRecipeForMenu({
        menuCode,
        menuName: menuName || '',
        category,
        kind: recipeKind,
        size: size || '단일',
        components: components.map(c => buildRecipeComponentForSave(c, unitPriceMap)),
        selectedRecipeGroupIds: savableRecipeGroupIds,
      });
      await onSaved?.();
      showToast('레시피 저장됨', 'ok');
    } catch (err) {
      showToast('저장 실패: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [
    supported,
    menuCode,
    menuName,
    category,
    recipeKind,
    size,
    components,
    savableRecipeGroupIds,
    unitPriceMap,
    onSaved,
  ]);

  return {
    components,
    setComponents,
    allIngredients,
    unitPriceMap,
    loaded,
    saving,
    supported,
    addRow,
    removeRow,
    updateRow,
    eligibleRecipeGroups,
    savableRecipeGroupIds,
    toggleRecipeGroup,
    recipeSummary,
    handleSave,
  };
}
