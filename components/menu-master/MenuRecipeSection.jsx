'use client';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { MenuRecipeComponentsTable } from '@/components/menu-master/MenuRecipeComponentsTable';
import { MenuRecipeGroupSelector } from '@/components/menu-master/MenuRecipeGroupSelector';
import { MenuRecipeSectionHeader } from '@/components/menu-master/MenuRecipeSectionHeader';
import { useMenuRecipeEditor } from '@/components/menu-master/useMenuRecipeEditor';
import { useRecipeIngredientSearch } from '@/components/menu-master/useRecipeIngredientSearch';

export const MenuRecipeSection = forwardRef(function MenuRecipeSection(
  { menuCode, menuName, category, size, sellingPrice, onSaved },
  ref
) {
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySearch, setCopySearch] = useState('');

  const {
    components,
    setComponents,
    allIngredients,
    allMenuItems,
    unitPriceMap,
    loaded,
    supported,
    addRow,
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
    menuName,
    category,
    size,
    sellingPrice,
    onSaved,
  });

  useImperativeHandle(
    ref,
    () => ({
      saveRecipe: handleSave,
    }),
    [handleSave]
  );

  const copyMenus = useMemo(() => {
    const q = copySearch.trim().toLowerCase();
    const self = String(menuCode || '').trim();
    const list = allMenuItems.filter(m => String(m.menuCode || '').trim() !== self);
    if (!q) return list.slice(0, 40);
    return list
      .filter(
        m =>
          (m.menuName || '').toLowerCase().includes(q) ||
          (m.menuCode || '').toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [allMenuItems, copySearch, menuCode]);

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
        copyOpen={copyOpen}
        onToggleCopy={() => {
          setCopyOpen(v => !v);
          setCopySearch('');
        }}
      />

      {copyOpen && (
        <div
          style={{
            border: '1px solid var(--divider)',
            borderRadius: 6,
            background: 'var(--surface)',
            marginBottom: 8,
            padding: '8px 10px',
          }}
        >
          <input
            autoFocus
            type="text"
            className="input sm"
            placeholder="메뉴명 / 코드 검색…"
            value={copySearch}
            onChange={e => setCopySearch(e.target.value)}
            style={{ width: '100%', marginBottom: 6, fontSize: 12 }}
          />
          <div
            style={{
              maxHeight: 180,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {copyMenus.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '4px 0' }}>
                검색 결과 없음
              </div>
            ) : (
              copyMenus.map(m => (
                <button
                  key={m.menuCode}
                  type="button"
                  className="btn ghost"
                  style={{
                    textAlign: 'left',
                    fontSize: 12,
                    padding: '4px 8px',
                    justifyContent: 'flex-start',
                  }}
                  onClick={() => {
                    copyFromMenu(m);
                    setCopyOpen(false);
                    setCopySearch('');
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'monospace',
                      color: 'var(--text-3)',
                      marginRight: 6,
                      fontSize: 11,
                    }}
                  >
                    {m.menuCode}
                  </span>
                  {m.menuName}
                  {m.size ? (
                    <span style={{ color: 'var(--text-4)', marginLeft: 4, fontSize: 11 }}>
                      {m.size}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            className="btn ghost"
            style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}
            onClick={() => {
              setCopyOpen(false);
              setCopySearch('');
            }}
          >
            취소
          </button>
        </div>
      )}

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
});
