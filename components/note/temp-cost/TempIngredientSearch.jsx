'use client';

import { ingredientName, unitPriceFromIngredient } from './tempCostUtils';

function TempIngredientOption({ ingredient, onAddIngredient }) {
  const name = ingredientName(ingredient);
  const unitPrice = unitPriceFromIngredient(ingredient);
  const numericUnitPrice = unitPrice ? Number(unitPrice) : null;

  return (
    <button
      type="button"
      key={ingredient.id}
      onMouseDown={() => onAddIngredient(ingredient)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '8px 12px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        color: 'var(--text-1)',
      }}
    >
      <span style={{ fontWeight: 600 }}>{name}</span>
      {numericUnitPrice != null && (
        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-3)' }}>
          {numericUnitPrice.toLocaleString()}원/{ingredient.baseUnitType || 'g'}
        </span>
      )}
      {ingredient.productCode && (
        <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-4)' }}>
          {ingredient.productCode}
        </span>
      )}
      {ingredient.category && (
        <span
          style={{
            marginLeft: 6,
            fontSize: 10,
            background: 'var(--surface-2)',
            color: 'var(--text-3)',
            padding: '1px 6px',
            borderRadius: 4,
          }}
        >
          {ingredient.category}
        </span>
      )}
    </button>
  );
}

export function TempIngredientSearch({
  search,
  searchRef,
  showDropdown,
  filteredIngredients,
  hasLinkedCostRows,
  onSearch,
  onShowDropdown,
  onCloseDropdownSoon,
  onAddIngredient,
  onRefreshLinkedCostRows,
}) {
  const hasSearch = search.trim();

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>
      <div style={{ position: 'relative', flex: 1 }} ref={searchRef}>
        <input
          className="form-input"
          value={search}
          onChange={event => {
            onSearch(event.target.value);
            onShowDropdown(true);
          }}
          onFocus={() => hasSearch && onShowDropdown(true)}
          onBlur={onCloseDropdownSoon}
          placeholder="재료명·식자재 코드 검색 후 클릭해서 추가…"
        />
        {showDropdown && hasSearch && filteredIngredients.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 20,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-md)',
              padding: '12px 14px',
              fontSize: 12,
              color: 'var(--text-3)',
            }}
          >
            &quot;{search}&quot; 결과 없음 — 식자재 관리에서 먼저 등록하세요
          </div>
        )}
        {showDropdown && filteredIngredients.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 20,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-md)',
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {filteredIngredients.map(ingredient => (
              <TempIngredientOption
                key={ingredient.id}
                ingredient={ingredient}
                onAddIngredient={onAddIngredient}
              />
            ))}
          </div>
        )}
      </div>
      {hasLinkedCostRows && (
        <button
          type="button"
          className="btn sm"
          onClick={onRefreshLinkedCostRows}
          style={{ height: 34, whiteSpace: 'nowrap' }}
        >
          연동값 갱신
        </button>
      )}
    </div>
  );
}
