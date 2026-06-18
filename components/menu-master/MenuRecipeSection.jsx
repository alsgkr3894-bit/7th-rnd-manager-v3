'use client';
import { useCallback, useEffect, useRef } from 'react';
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { MenuRecipeComponentsTable } from '@/components/menu-master/MenuRecipeComponentsTable';
import { MenuRecipeGroupSelector } from '@/components/menu-master/MenuRecipeGroupSelector';
import { MenuRecipeSectionHeader } from '@/components/menu-master/MenuRecipeSectionHeader';
import { useMenuRecipeEditor } from '@/components/menu-master/useMenuRecipeEditor';
import { useRecipeIngredientSearch } from '@/components/menu-master/useRecipeIngredientSearch';

export function MenuRecipeSection({ menuCode, menuName, category, size, sellingPrice, onSaved }) {
  const {
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
  } = useMenuRecipeEditor({
    menuCode,
    menuName,
    category,
    size,
    sellingPrice,
    onSaved,
  });

  const ingredientInputRefs = useRef({});
  const quantityInputRefs = useRef({});
  const pendingFocusNewRowRef = useRef(false);
  const {
    searchIdx,
    searchQ,
    suggestions,
    activeSuggestionIdx,
    handleIngredientInputChange,
    handleIngredientFocus,
    handleIngredientBlur,
    handleIngredientKeyDown,
    pickSuggestion,
  } = useRecipeIngredientSearch({
    allIngredients,
    unitPriceMap,
    setComponents,
    quantityInputRefs,
  });

  // pendingFocusNewRowRef: addRow 후 새 행 식자재 input으로 focus
  useEffect(() => {
    if (!pendingFocusNewRowRef.current) return;
    pendingFocusNewRowRef.current = false;
    if (components.length > 0) {
      const lastKey = components[components.length - 1]._key;
      ingredientInputRefs.current[lastKey]?.focus();
    }
  }, [components]);

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
        onIngredientInputChange={(idx, value) => handleIngredientInputChange(idx, value, updateRow)}
        onIngredientFocus={handleIngredientFocus}
        onIngredientBlur={handleIngredientBlur}
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
