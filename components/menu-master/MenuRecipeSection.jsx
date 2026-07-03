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
import {
  applyIngredientSuggestionToComponent,
  buildRecipeValidationDetails,
  createBlankRecipeComponentRow,
  isRecipeComponentMissingUnitPrice,
  isRecipeComponentMissingQuantity,
} from '@/components/menu-master/recipeComponentRows';
import { Icon } from '@/components/icons';
import { MenuRecipeComponentsTable } from '@/components/menu-master/MenuRecipeComponentsTable';
import { MenuRecipeGroupSelector } from '@/components/menu-master/MenuRecipeGroupSelector';
import { MenuRecipeImpactPreview } from '@/components/menu-master/MenuRecipeImpactPreview';
import { MenuRecipeSectionHeader } from '@/components/menu-master/MenuRecipeSectionHeader';
import { useMenuRecipeEditor } from '@/components/menu-master/useMenuRecipeEditor';
import { useRecipeIngredientSearch } from '@/components/menu-master/useRecipeIngredientSearch';

function normalizeIngredientSearchText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s/g, '');
}

function ingredientSearchText(ingredient) {
  return normalizeIngredientSearchText(
    `${ingredient?.ingredientName || ''} ${ingredient?.productCode || ''}`
  );
}

function formatQuickPrice(info) {
  if (info?.unitPrice == null) return '단가 없음';
  const unit = info.baseUnitType || 'g';
  return `${Number(info.unitPrice).toLocaleString()}원/${unit}`;
}

function quickQuantityValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? text : '';
}

export const MenuRecipeSection = forwardRef(function MenuRecipeSection(
  { menuCode, menuName, category, size, sellingPrice, onSaved, initialFocus = null },
  ref
) {
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySearch, setCopySearch] = useState('');
  const [onlyMissingPrice, setOnlyMissingPrice] = useState(false);
  const [quickAddQ, setQuickAddQ] = useState('');
  const [quickAddQty, setQuickAddQty] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddActiveIdx, setQuickAddActiveIdx] = useState(-1);
  const initialFocusConsumedRef = useRef(false);
  const quickAddBlurTimerRef = useRef(null);

  const {
    components,
    setComponents,
    allIngredients,
    allMenuItems,
    unitPriceMap,
    loaded,
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
  } = useMenuRecipeEditor({
    menuCode,
    menuName,
    category,
    size,
    sellingPrice,
    onSaved,
  });

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

  const missingPriceComponents = useMemo(
    () =>
      components.filter(component => isRecipeComponentMissingUnitPrice(component, unitPriceMap)),
    [components, unitPriceMap]
  );

  const quickAddSuggestions = useMemo(() => {
    const q = normalizeIngredientSearchText(quickAddQ);
    if (!q) return [];
    return allIngredients
      .filter(ingredient => !ingredient.discontinued && !ingredient.excluded)
      .filter(ingredient => ingredientSearchText(ingredient).includes(q))
      .slice(0, 10);
  }, [allIngredients, quickAddQ]);

  const displayedComponents = useMemo(() => {
    const rows = components.map((component, sourceIdx) => ({
      ...component,
      _sourceIdx: sourceIdx,
    }));
    return onlyMissingPrice
      ? rows.filter(component => isRecipeComponentMissingUnitPrice(component, unitPriceMap))
      : rows;
  }, [components, onlyMissingPrice, unitPriceMap]);

  const recipeValidation = useMemo(
    () => buildRecipeValidationDetails(components, unitPriceMap),
    [components, unitPriceMap]
  );

  useEffect(() => {
    setQuickAddActiveIdx(-1);
  }, [quickAddQ]);

  useEffect(
    () => () => {
      clearTimeout(quickAddBlurTimerRef.current);
    },
    []
  );

  const addQuickRow = useCallback(
    row => {
      const quantity = quickQuantityValue(quickAddQty);
      const nextRow = quantity ? { ...row, quantity } : row;
      pendingFocusQuantityKeyRef.current = quantity ? null : nextRow._key;
      pendingFocusQuickSearchRef.current = Boolean(quantity);
      if (onlyMissingPrice) setOnlyMissingPrice(false);
      setComponents(prev => [...prev, nextRow]);
      setQuickAddQ('');
      setQuickAddQty('');
      setQuickAddOpen(false);
      setQuickAddActiveIdx(-1);
    },
    [onlyMissingPrice, quickAddQty, setComponents]
  );

  const pickQuickIngredient = useCallback(
    ingredient => {
      addQuickRow(
        applyIngredientSuggestionToComponent(createBlankRecipeComponentRow(), ingredient, unitPriceMap)
      );
    },
    [addQuickRow, unitPriceMap]
  );

  const addManualQuickIngredient = useCallback(() => {
    const name = quickAddQ.trim();
    if (!name) return;
    addQuickRow({ ...createBlankRecipeComponentRow(), ingredientName: name });
  }, [addQuickRow, quickAddQ]);

  const focusQuickSearchInput = useCallback(() => {
    setTimeout(() => {
      const input = document.querySelector('[data-menu-recipe-quick-add="search"]');
      input?.focus?.();
    }, 0);
  }, []);

  useEffect(() => {
    if (!components.length) return;
    if (!pendingFocusQuickSearchRef.current) return;
    if (pendingFocusQuantityKeyRef.current !== null) return;
    if (pendingFocusNewRowRef.current) return;
    pendingFocusQuickSearchRef.current = false;
    if (!quickAddQ && !quickAddQty) focusQuickSearchInput();
  }, [components.length, focusQuickSearchInput, quickAddQ, quickAddQty]);

  const handleQuickAddKeyDown = useCallback(
    e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setQuickAddOpen(true);
        setQuickAddActiveIdx(idx => Math.min(idx + 1, quickAddSuggestions.length - 1));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setQuickAddActiveIdx(idx => Math.max(idx - 1, 0));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (!quickAddSuggestions.length) {
          addManualQuickIngredient();
          return;
        }
        const target =
          quickAddSuggestions[quickAddActiveIdx >= 0 ? quickAddActiveIdx : 0] ||
          quickAddSuggestions[0];
        if (target) pickQuickIngredient(target);
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setQuickAddOpen(false);
        setQuickAddActiveIdx(-1);
      }
    },
    [addManualQuickIngredient, pickQuickIngredient, quickAddActiveIdx, quickAddSuggestions]
  );

  const focusRecipeIssue = useCallback(
    target => {
      if (target === 'missing-price') {
        setOnlyMissingPrice(true);
      }

      setTimeout(() => {
        if (target === 'missing-quantity') {
          const row = components.find(component => isRecipeComponentMissingQuantity(component));
          if (row?._key) {
            quantityInputRefs.current[row._key]?.focus();
          }
          return;
        }

        if (target === 'missing-price') {
          const row = components.find(component =>
            isRecipeComponentMissingUnitPrice(component, unitPriceMap)
          );
          if (row?._key) {
            ingredientInputRefs.current[row._key]?.focus();
          }
          return;
        }

        const firstKey = components[0]?._key;
        if (firstKey) {
          ingredientInputRefs.current[firstKey]?.focus();
        }
      }, 80);
    },
    [components, unitPriceMap]
  );

  useImperativeHandle(
    ref,
    () => ({
      saveRecipe: handleSave,
      getRecipeSummary: () => recipeSummary,
      getRecipeValidation: () => recipeValidation,
      focusRecipeIssue,
    }),
    [focusRecipeIssue, handleSave, recipeSummary, recipeValidation]
  );

  useEffect(() => {
    if (!loaded || !initialFocus || initialFocusConsumedRef.current) return;
    if (!['recipe', 'missing-price', 'missing-quantity'].includes(initialFocus)) return;
    initialFocusConsumedRef.current = true;
    focusRecipeIssue(initialFocus);
  }, [focusRecipeIssue, initialFocus, loaded]);

  useEffect(() => {
    if (onlyMissingPrice && missingPriceComponents.length === 0) {
      setOnlyMissingPrice(false);
    }
  }, [missingPriceComponents.length, onlyMissingPrice]);

  // 빠른 추가는 수량, 빈 행 추가는 식자재 input으로 focus.
  useEffect(() => {
        if (pendingFocusQuantityKeyRef.current) {
      const targetKey = pendingFocusQuantityKeyRef.current;
      pendingFocusQuantityKeyRef.current = null;
      quantityInputRefs.current[targetKey]?.focus();
      quantityInputRefs.current[targetKey]?.select?.();
      return;
    }

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
      const visibleRows = onlyMissingPrice
        ? displayedComponents
        : components.map((component, sourceIdx) => ({ ...component, _sourceIdx: sourceIdx }));
      const position = visibleRows.findIndex(component => component._sourceIdx === idx);
      const nextSourceIdx = visibleRows[position + 1]?._sourceIdx;
      if (nextSourceIdx != null && components[nextSourceIdx]) {
        const nextKey = components[nextSourceIdx]._key;
        ingredientInputRefs.current[nextKey]?.focus();
      } else {
        if (onlyMissingPrice) setOnlyMissingPrice(false);
        addRow();
        pendingFocusNewRowRef.current = true;
      }
    },
    [addRow, components, displayedComponents, onlyMissingPrice]
  );

  if (!supported) return null;

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

      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--divider)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 1fr) 110px auto',
            gap: 8,
            alignItems: 'start',
          }}
        >
          <div style={{ position: 'relative' }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-3)',
                marginBottom: 6,
              }}
            >
              식자재 빠른 추가
            </label>
            <div style={{ position: 'relative' }}>
              <Icon.search
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  width: 14,
                  height: 14,
                  transform: 'translateY(-50%)',
                  color: 'var(--text-4)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                className="form-input"
                data-menu-recipe-quick-add="search"
                value={quickAddQ}
                onChange={e => {
                  setQuickAddQ(e.target.value);
                  setQuickAddOpen(true);
                }}
                onFocus={() => setQuickAddOpen(true)}
                onBlur={() => {
                  clearTimeout(quickAddBlurTimerRef.current);
                  quickAddBlurTimerRef.current = setTimeout(() => setQuickAddOpen(false), 140);
                }}
                onKeyDown={handleQuickAddKeyDown}
                placeholder="식자재명 또는 제품코드"
                style={{
                  width: '100%',
                  height: 38,
                  padding: '8px 10px 8px 32px',
                  fontSize: 13,
                }}
                aria-autocomplete="list"
              />
            </div>
            {quickAddOpen && quickAddQ.trim() && (
              <div
                role="listbox"
                style={{
                  position: 'absolute',
                  zIndex: 70,
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--surface)',
                  boxShadow: 'var(--shadow-md)',
                  overflow: 'hidden',
                }}
              >
                {quickAddSuggestions.length > 0 ? (
                  quickAddSuggestions.map((ingredient, suggestionIndex) => {
                    const upmKey =
                      ingredient.productCode ||
                      (ingredient.id != null ? String(ingredient.id) : null);
                    const priceInfo = upmKey ? unitPriceMap.get(upmKey) : null;
                    const active = quickAddActiveIdx === suggestionIndex;
                    return (
                      <button
                        key={ingredient.id || ingredient.productCode || ingredient.ingredientName}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setQuickAddActiveIdx(suggestionIndex)}
                        onMouseDown={e => {
                          e.preventDefault();
                          pickQuickIngredient(ingredient);
                        }}
                        style={{
                          width: '100%',
                          border: 0,
                          background: active ? 'var(--accent-soft)' : 'transparent',
                          color: 'var(--text-1)',
                          cursor: 'pointer',
                          padding: '8px 10px',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>
                            {ingredient.ingredientName}
                          </span>
                          <span
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 6,
                              marginTop: 2,
                              color: 'var(--text-4)',
                              fontSize: 11,
                            }}
                          >
                            {ingredient.productCode && <span>{ingredient.productCode}</span>}
                            <span>{formatQuickPrice(priceInfo)}</span>
                          </span>
                        </span>
                        <Icon.plus
                          aria-hidden="true"
                          style={{ width: 14, height: 14, color: 'var(--accent)' }}
                        />
                      </button>
                    );
                  })
                ) : (
                  <button
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      addManualQuickIngredient();
                    }}
                    style={{
                      width: '100%',
                      border: 0,
                      background: 'transparent',
                      color: 'var(--text-1)',
                      cursor: 'pointer',
                      padding: '10px',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      fontSize: 12,
                    }}
                  >
                    <b>{quickAddQ.trim()}</b> 수동 구성품으로 추가
                  </button>
                )}
                {quickAddSuggestions.length > 0 && quickAddQ.trim() && (
                  <button
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      addManualQuickIngredient();
                    }}
                    style={{
                      width: '100%',
                      border: 0,
                      borderTop: '1px solid var(--divider)',
                      background: 'var(--surface-2)',
                      color: 'var(--text-3)',
                      cursor: 'pointer',
                      padding: '8px 10px',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      fontSize: 12,
                    }}
                  >
                    검색어 그대로 수동 추가
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-3)',
                marginBottom: 6,
              }}
            >
              수량
            </label>
            <input
              type="number"
              min="0.000001"
              step="any"
              className="form-input"
              value={quickAddQty}
              onChange={e => setQuickAddQty(e.target.value)}
              onKeyDown={e => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                if (quickAddSuggestions.length) {
                  pickQuickIngredient(
                    quickAddSuggestions[quickAddActiveIdx >= 0 ? quickAddActiveIdx : 0] ||
                      quickAddSuggestions[0]
                  );
                } else {
                  addManualQuickIngredient();
                }
              }}
              placeholder="예: 30"
              style={{
                width: '100%',
                height: 38,
                fontSize: 13,
                padding: '8px 10px',
                textAlign: 'right',
              }}
            />
          </div>

          <button
            type="button"
            className="btn"
            style={{ height: 38, marginTop: 20, fontSize: 12, whiteSpace: 'nowrap' }}
            onClick={() => {
              if (onlyMissingPrice) setOnlyMissingPrice(false);
              addRow();
              pendingFocusNewRowRef.current = true;
            }}
          >
            <Icon.plus style={{ width: 13, height: 13 }} /> 구성품 추가
          </button>
        </div>
      </div>

      {copyOpen && (
        <div
          style={{
            border: '1px solid var(--divider)',
            borderRadius: 6,
            background: 'var(--surface)',
            margin: '12px 14px 0',
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
                    width: '100%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
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
                      fontSize: 11,
                      flexShrink: 0,
                      minWidth: 110,
                    }}
                  >
                    {m.menuCode}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: 0,
                    }}
                  >
                    {m.menuName}
                  </span>
                  {m.size ? (
                    <span
                      style={{ color: 'var(--text-4)', marginLeft: 8, fontSize: 11, flexShrink: 0 }}
                    >
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
          emptyMessage={
            onlyMissingPrice ? '단가 없는 구성품이 없습니다. 전체 보기로 돌아가세요.' : undefined
          }
        />

        <MenuRecipeImpactPreview components={components} allIngredients={allIngredients} />
      </div>
    </div>
  );
});
