'use client';
import { Icon } from '@/components/icons';
import { formatQuickPrice } from '@/components/menu-master/recipe/quickAddHelpers';

// MenuRecipeSection의 "식자재 빠른 추가" 그리드(검색+수량+구성품 추가 버튼) — 순수 표시용.
// 상태/핸들러는 useMenuRecipeQuickAdd에서 만들어 그대로 내려받는다.
export function MenuRecipeQuickAddPanel({
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
  unitPriceMap,
  onPickQuickIngredient,
  onAddManualQuickIngredient,
  onQuickAddKeyDown,
  onAddRow,
}) {
  return (
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
              onKeyDown={onQuickAddKeyDown}
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
                        onPickQuickIngredient(ingredient);
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
                    onAddManualQuickIngredient();
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
                    onAddManualQuickIngredient();
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
                onPickQuickIngredient(
                  quickAddSuggestions[quickAddActiveIdx >= 0 ? quickAddActiveIdx : 0] ||
                    quickAddSuggestions[0]
                );
              } else {
                onAddManualQuickIngredient();
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
          onClick={onAddRow}
        >
          <Icon.plus style={{ width: 13, height: 13 }} /> 구성품 추가
        </button>
      </div>
    </div>
  );
}
