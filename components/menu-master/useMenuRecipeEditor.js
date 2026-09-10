'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { eligibleRecipeGroupsForMenu } from '@/lib/cost/recipe-groups/effective';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { loadLatestUnitPriceMap, summarizeMenuRecipe } from '@/lib/menu-master/recipe-summary';
import { getAllMenuMaster } from '@/lib/menu-master/store';
import {
  getMenuRecipeForMenu,
  normalizeSelectedRecipeGroupIds,
  upsertMenuRecipeForMenu,
} from '@/lib/menu-recipes';
import { saveRecipeVersionSnapshot } from '@/lib/menu-master/recipe-versions';
import { logWork } from '@/lib/work-log';
import { recipeStoreKindForCategory } from '@/lib/recipe-master/sync';
import {
  buildSavableRecipeComponents,
  copyRecipeComponentRow,
  createBlankRecipeComponentRow,
  hydrateRecipeComponent,
} from '@/components/menu-master/recipeComponentRows';

export function useMenuRecipeEditor({
  menuCode,
  sourceMenuCode,
  menuName,
  category,
  size,
  sellingPrice,
  onSaved,
}) {
  const [components, setComponents] = useState([]);
  const [selectedRecipeGroupIds, setSelectedRecipeGroupIds] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allIngredients, setAllIngredients] = useState([]);
  const [allMenuItems, setAllMenuItems] = useState([]);
  const [recipeGroups, setRecipeGroups] = useState([]);
  const [unitPriceMap, setUnitPriceMap] = useState(new Map());

  // 조회는 모달을 열 때의 원래 코드(sourceMenuCode) 기준, 저장은 현재 입력된 menuCode
  // 기준으로 분리한다. 메뉴마스터에서 중분류를 바꾸면 피자류는 menuCode 자체가 바뀌는데
  // (예: P-OR-005-L → P-PR-001-L), 조회까지 menuCode를 따라가면 새 코드로는 아직 저장된
  // 레시피가 없어 화면의 구성품이 비워지고, 그 상태로 저장하면 메뉴마스터 저장이 먼저
  // menu_recipes 행을 새 코드로 옮긴 직후 이 빈 상태가 그 위를 덮어써 구성품이
  // 영구 삭제된다. sourceMenuCode는 모달이 열려 있는 동안 바뀌지 않으므로, 조회 키를
  // 고정해두면 중분류를 바꿔도 이미 불러온 구성품이 그대로 남고, 저장 시 캐스케이드로
  // 옮겨진 행에 동일한 구성품이 다시 쓰인다.
  const loadMenuCode = sourceMenuCode || menuCode;
  const recipeKind = recipeStoreKindForCategory(category);
  const supported = Boolean(recipeKind && menuCode);

  useEffect(() => {
    setLoaded(false);
    setComponents([]);
    setSelectedRecipeGroupIds([]);
    setAllIngredients([]);
    setAllMenuItems([]);
    setRecipeGroups([]);
    setUnitPriceMap(new Map());
    if (!loadMenuCode) return;
    let ignore = false;
    initDB().then(async () => {
      const [existing, ingredients, latestUnitPriceMap, groups, menuItems] = await Promise.all([
        getMenuRecipeForMenu({ menuCode: loadMenuCode, menuName, category, size }),
        getAllIngredients(),
        loadLatestUnitPriceMap(),
        getAllRecipeGroups(),
        getAllMenuMaster(),
      ]);
      if (ignore) return;
      setComponents(
        existing?.components?.length
          ? existing.components.map(c => hydrateRecipeComponent(c, latestUnitPriceMap))
          : []
      );
      setSelectedRecipeGroupIds(normalizeSelectedRecipeGroupIds(existing?.selectedRecipeGroupIds));
      setAllIngredients(ingredients);
      setAllMenuItems(menuItems.filter(m => m.status !== 'discontinued'));
      setRecipeGroups(groups);
      setUnitPriceMap(latestUnitPriceMap);
      setLoaded(true);
    });
    return () => {
      ignore = true;
    };
    // api functions are stable module-level imports, loadMenuCode/category cover the relevant deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMenuCode, category]);

  const updateRow = useCallback((idx, field, val) => {
    setComponents(prev => prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
  }, []);

  const removeRow = useCallback(idx => {
    setComponents(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const addRow = useCallback(() => {
    setComponents(prev => [...prev, createBlankRecipeComponentRow()]);
  }, []);

  const copyRow = useCallback(idx => {
    setComponents(prev => {
      const row = prev[idx];
      if (!row) return prev;
      const next = [...prev];
      next.splice(idx + 1, 0, copyRecipeComponentRow(row));
      return next;
    });
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

  const copyFromMenu = useCallback(
    async sourceMenu => {
      const source = await getMenuRecipeForMenu({ menuCode: sourceMenu.menuCode });
      if (!source?.components?.length) {
        showToast('복사할 구성품이 없습니다', 'warn');
        return;
      }
      setComponents(source.components.map(c => hydrateRecipeComponent(c, unitPriceMap)));
      showToast(`'${sourceMenu.menuName || sourceMenu.menuCode}' 구성품 복사됨 (저장 전)`, 'ok');
    },
    [unitPriceMap]
  );

  const handleSave = useCallback(
    async (options = {}) => {
      const {
        showSuccessToast = true,
        showErrorToast = true,
        runOnSaved = true,
        throwOnError = false,
      } = options;
      if (!supported || !loaded) return { skipped: true };
      setSaving(true);
      try {
        const savableComponents = buildSavableRecipeComponents(components, unitPriceMap);
        await upsertMenuRecipeForMenu({
          menuCode,
          menuName: menuName || '',
          category,
          kind: recipeKind,
          size: size || '단일',
          components: savableComponents,
          selectedRecipeGroupIds: savableRecipeGroupIds,
        });
        // 이력 스냅샷은 부수 기록이다 — 실패해도 레시피 저장 자체는 이미 끝났으므로
        // 조용히 무시한다(사용자에게 저장 실패로 보이면 안 됨).
        saveRecipeVersionSnapshot({
          menuCode,
          menuName: menuName || '',
          size: size || '단일',
          components: savableComponents,
          selectedRecipeGroupIds: savableRecipeGroupIds,
          totalCost: recipeSummary?.totalCost,
          costRate: recipeSummary?.costRate,
          sellingPrice,
        }).catch(err => console.warn('[useMenuRecipeEditor] 버전 스냅샷 저장 실패', err));
        logWork('RECIPE_SAVE', menuName || menuCode || '레시피');
        if (runOnSaved) await onSaved?.();
        if (showSuccessToast) showToast('레시피 저장됨', 'ok');
        return { saved: true };
      } catch (err) {
        if (showErrorToast) showToast('저장 실패: ' + err.message, 'error');
        if (throwOnError) throw err;
        return { saved: false, error: err };
      } finally {
        setSaving(false);
      }
    },
    [
      supported,
      loaded,
      menuCode,
      menuName,
      category,
      recipeKind,
      size,
      components,
      savableRecipeGroupIds,
      unitPriceMap,
      recipeSummary,
      sellingPrice,
      onSaved,
    ]
  );

  return {
    components,
    setComponents,
    allIngredients,
    allMenuItems,
    unitPriceMap,
    loaded,
    saving,
    supported,
    addRow,
    copyRow,
    removeRow,
    updateRow,
    eligibleRecipeGroups,
    savableRecipeGroupIds,
    toggleRecipeGroup,
    recipeSummary,
    handleSave,
    copyFromMenu,
  };
}
