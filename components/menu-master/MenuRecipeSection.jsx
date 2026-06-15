'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { initDB } from '@/lib/db';
import { showToast } from '@/components/Toast';
import { getAllIngredients } from '@/lib/ingredient';
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { loadLatestUnitPriceMap, summarizeMenuRecipe } from '@/lib/menu-master/recipe-summary';
import { getMenuRecipeForMenu, upsertMenuRecipeForMenu } from '@/lib/menu-recipes';
import { recipeStoreKindForCategory } from '@/lib/recipe-master/sync';
import { MenuRecipeComponentsTable } from '@/components/menu-master/MenuRecipeComponentsTable';
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
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allIngs, setAllIngs] = useState([]);
  const [unitPriceMap, setUnitPriceMap] = useState(new Map());
  const [searchIdx, setSearchIdx] = useState(null); // index of row being searched
  const [searchQ, setSearchQ] = useState('');

  const recipeKind = recipeStoreKindForCategory(category);
  const supported = Boolean(recipeKind && menuCode);

  useEffect(() => {
    setLoaded(false);
    setComponents([]);
    setAllIngs([]);
    setUnitPriceMap(new Map());
    if (!supported) return;
    let ignore = false;
    initDB().then(async () => {
      const [existing, ings, latestUnitPriceMap] = await Promise.all([
        getMenuRecipeForMenu({ menuCode, menuName, category, size }),
        getAllIngredients(),
        loadLatestUnitPriceMap(),
      ]);
      if (ignore) return;
      setComponents(
        existing?.components?.length
          ? existing.components.map(c => hydrateComponent(c, latestUnitPriceMap))
          : []
      );
      setAllIngs(ings);
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
    },
    [unitPriceMap]
  );

  const recipeSummary = useMemo(
    () =>
      summarizeMenuRecipe(
        { menuCode, category, price: sellingPrice },
        { components },
        unitPriceMap
      ),
    [category, components, menuCode, sellingPrice, unitPriceMap]
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
        hasComponents={components.length > 0}
        recipeSummary={recipeSummary}
        saving={saving}
        onSave={handleSave}
      />

      <MenuRecipeComponentsTable
        components={components}
        searchIdx={searchIdx}
        searchQ={searchQ}
        suggestions={suggestions}
        unitPriceMap={unitPriceMap}
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
        onPickSuggestion={pickSuggestion}
        onQuantityChange={(idx, value) => updateRow(idx, 'quantity', value)}
        onUnitChange={(idx, value) => updateRow(idx, 'unit', normalizeCostBaseUnit(value))}
        onRemoveRow={removeRow}
      />

      <button
        type="button"
        className="btn sm"
        style={{ marginTop: 8, width: '100%', fontSize: 12 }}
        onClick={addRow}
      >
        + 구성품 추가
      </button>
    </div>
  );
}
