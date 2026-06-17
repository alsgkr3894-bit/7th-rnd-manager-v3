'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initDB } from '@/lib/db';
import { showToast } from '@/components/Toast';
import { getAllIngredients } from '@/lib/ingredient';
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { loadLatestUnitPriceMap, summarizeMenuRecipe } from '@/lib/menu-master/recipe-summary';
import {
  getMenuRecipeForMenu,
  normalizeSelectedRecipeGroupIds,
  upsertMenuRecipeForMenu,
} from '@/lib/menu-recipes';
import { eligibleRecipeGroupsForMenu } from '@/lib/cost/recipe-groups/effective';
import { recipeStoreKindForCategory } from '@/lib/recipe-master/sync';
import { MenuRecipeComponentsTable } from '@/components/menu-master/MenuRecipeComponentsTable';
import { MenuRecipeGroupSelector } from '@/components/menu-master/MenuRecipeGroupSelector';
import { MenuRecipeSectionHeader } from '@/components/menu-master/MenuRecipeSectionHeader';

let _rowKey = 0;
function newRow() {
  return {
    _key: ++_rowKey,
    ingredientName: '',
    productCode: '',
    quantity: '',
    unit: 'g',
    unitPrice: null,
  };
}

function productCodeOf(component) {
  return String(component?.productCode || '').trim();
}

function unitPriceInfoFor(component, unitPriceMap) {
  const productCode = productCodeOf(component);
  return productCode ? unitPriceMap.get(productCode) || null : null;
}

function hydrateComponent(component, unitPriceMap) {
  const info = unitPriceInfoFor(component, unitPriceMap);
  return {
    ...component,
    _key: ++_rowKey,
    unit: normalizeCostBaseUnit(info?.baseUnitType || component?.unit),
    unitPrice: info?.unitPrice ?? component?.unitPrice ?? null,
  };
}

function buildSaveComponent(component, unitPriceMap) {
  const productCode = productCodeOf(component);
  const info = productCode ? unitPriceMap.get(productCode) : null;
  const quantity = component.quantity !== '' ? Number(component.quantity) : null;
  return {
    ingredientName: component.ingredientName || '',
    productCode: productCode || null,
    quantity,
    unit: normalizeCostBaseUnit(info?.baseUnitType || component.unit),
    unitPrice:
      info?.unitPrice ?? (component.unitPrice != null ? Number(component.unitPrice) : null),
  };
}

export function MenuRecipeSection({ menuCode, menuName, category, size, sellingPrice, onSaved }) {
  const [components, setComponents] = useState([]);
  const [selectedRecipeGroupIds, setSelectedRecipeGroupIds] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allIngs, setAllIngs] = useState([]);
  const [recipeGroups, setRecipeGroups] = useState([]);
  const [unitPriceMap, setUnitPriceMap] = useState(new Map());
  const [searchIdx, setSearchIdx] = useState(null); // index of row being searched
  const [searchQ, setSearchQ] = useState('');
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);

  // ref maps: { [component._key]: HTMLInputElement }
  const ingredientInputRefs = useRef({});
  const quantityInputRefs = useRef({});
  // pending focus after addRow
  const pendingFocusNewRowRef = useRef(false);

  const recipeKind = recipeStoreKindForCategory(category);
  const supported = Boolean(recipeKind && menuCode);

  useEffect(() => {
    setLoaded(false);
    setComponents([]);
    setSelectedRecipeGroupIds([]);
    setAllIngs([]);
    setRecipeGroups([]);
    setUnitPriceMap(new Map());
    if (!supported) return;
    let ignore = false;
    initDB().then(async () => {
      const [existing, ings, latestUnitPriceMap, groups] = await Promise.all([
        getMenuRecipeForMenu({ menuCode, menuName, category, size }),
        getAllIngredients(),
        loadLatestUnitPriceMap(),
        getAllRecipeGroups(),
      ]);
      if (ignore) return;
      setComponents(
        existing?.components?.length
          ? existing.components.map(c => hydrateComponent(c, latestUnitPriceMap))
          : []
      );
      setSelectedRecipeGroupIds(normalizeSelectedRecipeGroupIds(existing?.selectedRecipeGroupIds));
      setAllIngs(ings);
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

  const suggestions = useMemo(() => {
    if (!searchQ.trim()) return [];
    const q = searchQ.toLowerCase().replace(/\s/g, '');
    return allIngs
      .filter(i => !i.discontinued && !i.excluded)
      .filter(
        i =>
          (i.ingredientName || '').toLowerCase().replace(/\s/g, '').includes(q) ||
          (i.productCode || '').toLowerCase().replace(/\s/g, '').includes(q)
      )
      .slice(0, 8);
  }, [searchQ, allIngs]);

  // searchQ 변경 시 active index 초기화
  useEffect(() => {
    setActiveSuggestionIdx(-1);
  }, [searchQ]);

  // pendingFocusNewRowRef: addRow 후 새 행 식자재 input으로 focus
  useEffect(() => {
    if (!pendingFocusNewRowRef.current) return;
    pendingFocusNewRowRef.current = false;
    if (components.length > 0) {
      const lastKey = components[components.length - 1]._key;
      ingredientInputRefs.current[lastKey]?.focus();
    }
  }, [components]);

  const updateRow = useCallback((idx, field, val) => {
    setComponents(prev => prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
  }, []);

  const removeRow = useCallback(idx => {
    setComponents(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const addRow = useCallback(() => {
    setComponents(prev => [...prev, newRow()]);
  }, []);

  const pickSuggestion = useCallback(
    (idx, ing) => {
      setComponents(prev =>
        prev.map((c, i) =>
          i === idx
            ? {
                ...c,
                ingredientName: ing.ingredientName || '',
                productCode: ing.productCode || '',
                unit: normalizeCostBaseUnit(
                  unitPriceMap.get(ing.productCode)?.baseUnitType || ing.baseUnitType
                ),
                unitPrice: unitPriceMap.get(ing.productCode)?.unitPrice ?? null,
              }
            : c
        )
      );
      setSearchIdx(null);
      setSearchQ('');
      setActiveSuggestionIdx(-1);
      // 선택 후 수량 input으로 focus — components 상태 반영은 비동기이므로 ref 기준으로 처리
      // idx 기준으로 같은 행의 _key를 구해 focus. setTimeout으로 render 후 처리.
      setComponents(prev => {
        const component = prev[idx];
        if (component) {
          setTimeout(() => {
            quantityInputRefs.current[component._key]?.focus();
          }, 0);
        }
        return prev;
      });
    },
    [unitPriceMap]
  );

  const handleIngredientKeyDown = useCallback(
    (idx, e) => {
      if (searchIdx !== idx || suggestions.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIdx(i => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target =
          activeSuggestionIdx >= 0 ? suggestions[activeSuggestionIdx] : suggestions[0];
        if (target) pickSuggestion(idx, target);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSearchIdx(null);
        setSearchQ('');
        setActiveSuggestionIdx(-1);
      }
    },
    [searchIdx, suggestions, activeSuggestionIdx, pickSuggestion]
  );

  const handleQuantityKeyDown = useCallback(
    (idx, e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (idx < components.length - 1) {
        const nextKey = components[idx + 1]._key;
        ingredientInputRefs.current[nextKey]?.focus();
      } else {
        addRow();
        pendingFocusNewRowRef.current = true;
      }
    },
    [components, addRow]
  );

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
        components: components.map(c => buildSaveComponent(c, unitPriceMap)),
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

  if (!supported) return null;

  if (!loaded) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '8px 0' }}>레시피 로딩 중…</div>
    );
  }

  return (
    <div style={{ marginTop: 4 }}>
      <MenuRecipeSectionHeader
        hasComponents={recipeSummary.componentCount > 0}
        recipeSummary={recipeSummary}
        saving={saving}
        onSave={handleSave}
      />

      <MenuRecipeGroupSelector
        groups={eligibleRecipeGroups}
        selectedGroupIds={savableRecipeGroupIds}
        onToggle={toggleRecipeGroup}
      />

      <MenuRecipeComponentsTable
        components={components}
        searchIdx={searchIdx}
        searchQ={searchQ}
        suggestions={suggestions}
        activeSuggestionIdx={activeSuggestionIdx}
        unitPriceMap={unitPriceMap}
        ingredientInputRefs={ingredientInputRefs}
        quantityInputRefs={quantityInputRefs}
        onIngredientInputChange={(idx, value) => {
          setSearchIdx(idx);
          setSearchQ(value);
          updateRow(idx, 'ingredientName', value);
        }}
        onIngredientFocus={(idx, value) => {
          setSearchIdx(idx);
          setSearchQ(value);
        }}
        onIngredientBlur={() => setTimeout(() => setSearchIdx(null), 150)}
        onIngredientKeyDown={handleIngredientKeyDown}
        onPickSuggestion={pickSuggestion}
        onQuantityChange={(idx, value) => updateRow(idx, 'quantity', value)}
        onQuantityKeyDown={handleQuantityKeyDown}
        onUnitChange={(idx, value) => updateRow(idx, 'unit', normalizeCostBaseUnit(value))}
        onRemoveRow={removeRow}
      />

      <button
        type="button"
        className="btn sm"
        style={{ marginTop: 8, width: '100%', fontSize: 12 }}
        onClick={() => {
          addRow();
          pendingFocusNewRowRef.current = true;
        }}
      >
        + 구성품 추가
      </button>
    </div>
  );
}
