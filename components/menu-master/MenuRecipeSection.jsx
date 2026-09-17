'use client';
import { forwardRef, useRef, useState } from 'react';
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { MenuRecipeComponentsTable } from '@/components/menu-master/MenuRecipeComponentsTable';
import { MenuRecipeGroupSelector } from '@/components/menu-master/MenuRecipeGroupSelector';
import { MenuRecipeImpactPreview } from '@/components/menu-master/MenuRecipeImpactPreview';
import {
  MenuRecipeCopyPanel,
  MenuRecipeGuardNotice,
  MenuRecipeQuickAddPanel,
  MenuRecipeVersionHistory,
} from '@/components/menu-master/recipe';
import { MenuRecipeSectionHeader } from '@/components/menu-master/MenuRecipeSectionHeader';
import { useMenuRecipeEditor } from '@/components/menu-master/useMenuRecipeEditor';
import { useRecipeIngredientSearch } from '@/components/menu-master/useRecipeIngredientSearch';
import { useMenuRecipeQuickAdd } from '@/components/menu-master/recipe/hooks/useMenuRecipeQuickAdd';
import { useMenuRecipeRowFocus } from '@/components/menu-master/recipe/hooks/useMenuRecipeRowFocus';
import { useMenuRecipeCopyMenus } from '@/components/menu-master/recipe/hooks/useMenuRecipeCopyMenus';
import { useMenuRecipePreviewComponents } from '@/components/menu-master/recipe/hooks/useMenuRecipePreviewComponents';

export const MenuRecipeSection = forwardRef(function MenuRecipeSection(
  {
    menuCode,
    sourceMenuCode,
    menuName,
    category,
    size,
    sellingPrice,
    onSaved,
    initialFocus = null,
    draft = false,
  },
  ref
) {
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySearch, setCopySearch] = useState('');
  const [onlyMissingPrice, setOnlyMissingPrice] = useState(false);

  const {
    components,
    setComponents,
    allIngredients,
    allMenuItems,
    unitPriceMap,
    loaded,
    supported,
    supportedCategory,
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
  } = useMenuRecipeEditor({
    menuCode,
    sourceMenuCode,
    menuName,
    category,
    size,
    sellingPrice,
    onSaved,
    draft,
  });

  const previewComponents = useMenuRecipePreviewComponents({
    components,
    menuCode,
    category,
    size,
    eligibleRecipeGroups,
    savableRecipeGroupIds,
  });

  const copyMenus = useMenuRecipeCopyMenus({ allMenuItems, copySearch, menuCode });

  const ingredientInputRefs = useRef({});
  const quantityInputRefs = useRef({});
  const pendingFocusNewRowRef = useRef(false);
  const pendingFocusQuantityKeyRef = useRef(null);
  const pendingFocusQuickSearchRef = useRef(false);

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

  // 순서 주의: quickAdd가 pendingFocusQuickSearchRef를 "읽기"만 하는 이펙트를 등록하고,
  // rowFocus가 같은 ref를 "쓰는"(초기화) 이펙트를 나중에 등록해야 빠른 추가 후 검색칸
  // 재포커스가 정상 동작한다 — 두 훅의 호출 순서를 바꾸지 말 것.
  const {
    quickAddQ,
    setQuickAddQ,
    quickAddQty,
    setQuickAddQty,
    quickAddOpen,
    setQuickAddOpen,
    quickAddActiveIdx,
    setQuickAddActiveIdx,
    quickAddBlurTimerRef,
    quickAddSuggestions,
    pickQuickIngredient,
    addManualQuickIngredient,
    handleQuickAddKeyDown,
  } = useMenuRecipeQuickAdd({
    components,
    setComponents,
    allIngredients,
    unitPriceMap,
    onlyMissingPrice,
    setOnlyMissingPrice,
    pendingFocusNewRowRef,
    pendingFocusQuantityKeyRef,
    pendingFocusQuickSearchRef,
  });

  const { missingPriceComponents, displayedComponents, handleReorderRows, handleQuantityKeyDown } =
    useMenuRecipeRowFocus({
      ref,
      loaded,
      initialFocus,
      components,
      setComponents,
      unitPriceMap,
      addRow,
      onlyMissingPrice,
      setOnlyMissingPrice,
      handleSave,
      recipeSummary,
      ingredientInputRefs,
      quantityInputRefs,
      pendingFocusNewRowRef,
      pendingFocusQuantityKeyRef,
    });

  const handleQuickAddRow = () => {
    if (onlyMissingPrice) setOnlyMissingPrice(false);
    addRow();
    pendingFocusNewRowRef.current = true;
  };

  if (!supportedCategory) {
    return (
      <MenuRecipeGuardNotice message="이 카테고리는 레시피 원가를 지원하지 않습니다. (카테고리를 확인해 주세요)" />
    );
  }

  // supportedCategory는 만족하지만 menuCode가 아직 비어 있는 경우 — 새 메뉴를 추가하는
  // 중이라 코드를 아직 안 적었을 때다(draft 모드). 카테고리 문제로 오해하지 않도록
  // 별도 안내를 보여준다.
  if (!supported) {
    return (
      <MenuRecipeGuardNotice message="메뉴코드를 입력하면 저장 시 이 레시피가 함께 저장됩니다." />
    );
  }

  if (!loaded) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '8px 0' }}>레시피 로딩 중…</div>
    );
  }

  return (
    <div
      style={{
        marginTop: 4,
        border: '1px solid var(--divider)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--surface)',
      }}
    >
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--divider)' }}>
        <MenuRecipeSectionHeader
          hasComponents={recipeSummary.componentCount > 0}
          recipeSummary={recipeSummary}
          copyOpen={copyOpen}
          onlyMissingPrice={onlyMissingPrice}
          missingPriceFilterCount={missingPriceComponents.length}
          onToggleMissingPrice={() => setOnlyMissingPrice(value => !value)}
          onToggleCopy={() => {
            setCopyOpen(v => !v);
            setCopySearch('');
          }}
        />
      </div>

      <MenuRecipeQuickAddPanel
        quickAddQ={quickAddQ}
        setQuickAddQ={setQuickAddQ}
        quickAddQty={quickAddQty}
        setQuickAddQty={setQuickAddQty}
        quickAddOpen={quickAddOpen}
        setQuickAddOpen={setQuickAddOpen}
        quickAddActiveIdx={quickAddActiveIdx}
        setQuickAddActiveIdx={setQuickAddActiveIdx}
        quickAddBlurTimerRef={quickAddBlurTimerRef}
        quickAddSuggestions={quickAddSuggestions}
        unitPriceMap={unitPriceMap}
        onPickQuickIngredient={pickQuickIngredient}
        onAddManualQuickIngredient={addManualQuickIngredient}
        onQuickAddKeyDown={handleQuickAddKeyDown}
        onAddRow={handleQuickAddRow}
      />

      {copyOpen && (
        <MenuRecipeCopyPanel
          search={copySearch}
          onSearchChange={setCopySearch}
          menus={copyMenus}
          onPick={m => {
            copyFromMenu(m);
            setCopyOpen(false);
            setCopySearch('');
          }}
          onCancel={() => {
            setCopyOpen(false);
            setCopySearch('');
          }}
        />
      )}

      <div style={{ padding: '12px 14px' }}>
        <MenuRecipeGroupSelector
          groups={eligibleRecipeGroups}
          selectedGroupIds={savableRecipeGroupIds}
          onToggle={toggleRecipeGroup}
        />

        <MenuRecipeComponentsTable
          components={displayedComponents}
          searchIdx={searchIdx}
          searchQ={searchQ}
          suggestions={suggestions}
          activeSuggestionIdx={activeSuggestionIdx}
          unitPriceMap={unitPriceMap}
          ingredientInputRefs={ingredientInputRefs}
          quantityInputRefs={quantityInputRefs}
          onIngredientInputChange={(idx, value) =>
            handleIngredientInputChange(idx, value, updateRow)
          }
          onIngredientFocus={handleIngredientFocus}
          onIngredientBlur={handleIngredientBlur}
          onIngredientKeyDown={handleIngredientKeyDown}
          onPickSuggestion={pickSuggestion}
          onQuantityChange={(idx, value) => updateRow(idx, 'quantity', value)}
          onQuantityKeyDown={handleQuantityKeyDown}
          onUnitChange={(idx, value) => updateRow(idx, 'unit', normalizeCostBaseUnit(value))}
          onRemoveRow={removeRow}
          onCopyRow={copyRow}
          onUnitPriceOverride={(idx, price) => updateRow(idx, 'unitPrice', price)}
          onReorderRows={handleReorderRows}
          reorderDisabled={onlyMissingPrice}
          emptyMessage={
            onlyMissingPrice ? '단가 없는 구성품이 없습니다. 전체 보기로 돌아가세요.' : undefined
          }
        />

        <MenuRecipeImpactPreview components={previewComponents} allIngredients={allIngredients} />

        <div style={{ marginTop: 12 }}>
          <MenuRecipeVersionHistory
            menuCode={menuCode}
            currentComponents={components}
            currentTotalCost={recipeSummary?.totalCost}
            currentCostRate={recipeSummary?.costRate}
          />
        </div>
      </div>
    </div>
  );
});
