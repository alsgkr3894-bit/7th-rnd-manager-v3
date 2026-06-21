'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';
import { formatUnitPrice } from '@/lib/format';
import { COST_BASE_UNITS, normalizeCostBaseUnit } from '@/lib/cost/unit-policy';

function SuggestionItem({ ingredient, unitPriceMap, isActive, onPick }) {
  // productCode 없는 수동 식자재는 unitPriceMap이 String(id)를 키로 사용
  const upmKey = ingredient.productCode || (ingredient.id != null ? String(ingredient.id) : null);
  const info = upmKey ? unitPriceMap.get(upmKey) : null;
  return (
    <div
      role="option"
      aria-selected={isActive}
      onMouseDown={onPick}
      style={{
        padding: '6px 10px',
        cursor: 'pointer',
        fontSize: 12,
        background: isActive ? 'var(--accent-soft)' : undefined,
      }}
    >
      {ingredient.ingredientName}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 1 }}>
        {ingredient.productCode && (
          <span style={{ color: 'var(--text-4)', fontSize: 11 }}>{ingredient.productCode}</span>
        )}
        {info?.unitPrice != null && (
          <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
            {formatUnitPrice(info.unitPrice, info.baseUnitType)}
          </span>
        )}
      </div>
    </div>
  );
}

function UnitPriceCell({ idx, component, onOverride }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  if (!editing) {
    return (
      <button
        type="button"
        title={
          onOverride
            ? '클릭하여 단가 직접 입력 (식자재 단가 설정 권장)'
            : '식자재 관리에서 단가를 설정하세요'
        }
        style={{
          background: 'none',
          border: 'none',
          cursor: onOverride ? 'pointer' : 'default',
          color: 'var(--warn)',
          fontSize: 11,
          padding: 0,
          textDecoration: onOverride ? 'underline dotted' : 'none',
        }}
        onClick={() => {
          if (!onOverride) return;
          setValue('');
          setEditing(true);
        }}
      >
        단가 없음
      </button>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <input
        autoFocus
        type="number"
        min="0"
        step="1"
        placeholder="단가/g"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            const n = Number(value);
            if (value !== '' && n >= 0) {
              onOverride(idx, n);
            }
            setEditing(false);
          }
          if (e.key === 'Escape') setEditing(false);
        }}
        style={{
          width: 64,
          fontSize: 11,
          padding: '2px 4px',
          border: '1px solid var(--primary)',
          borderRadius: 3,
          textAlign: 'right',
        }}
      />
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: 'var(--text-4)',
        }}
        onClick={() => setEditing(false)}
      >
        <Icon.close style={{ width: 9, height: 9 }} />
      </button>
    </span>
  );
}

function MenuRecipeTableRow({
  component,
  idx,
  searchIdx,
  searchQ,
  suggestions,
  activeSuggestionIdx,
  unitPriceMap,
  ingredientInputRefs,
  quantityInputRefs,
  onIngredientInputChange,
  onIngredientFocus,
  onIngredientBlur,
  onIngredientKeyDown,
  onPickSuggestion,
  onQuantityChange,
  onQuantityKeyDown,
  onUnitChange,
  onRemoveRow,
  onCopyRow,
  onUnitPriceOverride,
}) {
  const subtotal =
    component.unitPrice != null && Number(component.quantity) > 0
      ? Math.round(component.unitPrice * Number(component.quantity))
      : null;

  return (
    <tr style={{ borderBottom: '1px solid var(--divider)' }}>
      <td style={{ padding: '4px 4px', position: 'relative' }}>
        <input
          ref={el => {
            if (ingredientInputRefs) {
              if (el) ingredientInputRefs.current[component._key] = el;
              else delete ingredientInputRefs.current[component._key];
            }
          }}
          className="form-input"
          style={{ width: '100%', fontSize: 12, padding: '4px 6px' }}
          value={searchIdx === idx ? searchQ : component.ingredientName || ''}
          onChange={e => onIngredientInputChange(idx, e.target.value)}
          onFocus={() => onIngredientFocus(idx, component.ingredientName || '')}
          onBlur={onIngredientBlur}
          onKeyDown={e => onIngredientKeyDown?.(idx, e)}
          placeholder="식자재명 검색 (↑↓ 이동, Enter 선택)"
          aria-autocomplete="list"
        />
        {searchIdx === idx && suggestions.length > 0 && (
          <div
            role="listbox"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              zIndex: 50,
              maxHeight: 160,
              overflowY: 'auto',
            }}
          >
            {!searchQ?.trim() && (
              <div
                style={{
                  padding: '4px 10px',
                  fontSize: 10,
                  color: 'var(--text-4)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                최근 사용
              </div>
            )}
            {suggestions.map((ingredient, suggestionIndex) => (
              <SuggestionItem
                key={ingredient.id || ingredient.productCode}
                ingredient={ingredient}
                unitPriceMap={unitPriceMap}
                isActive={activeSuggestionIdx === suggestionIndex}
                onPick={() => onPickSuggestion(idx, ingredient)}
              />
            ))}
          </div>
        )}
      </td>
      <td style={{ padding: '4px 4px' }}>
        <input
          ref={el => {
            if (quantityInputRefs) {
              if (el) quantityInputRefs.current[component._key] = el;
              else delete quantityInputRefs.current[component._key];
            }
          }}
          className="form-input"
          type="number"
          min="0"
          style={{ width: '100%', fontSize: 12, padding: '4px 6px', textAlign: 'right' }}
          value={component.quantity ?? ''}
          onChange={e => onQuantityChange(idx, e.target.value)}
          onKeyDown={e => onQuantityKeyDown?.(idx, e)}
          placeholder="0"
          title="수량 입력 후 Enter로 다음 구성품"
        />
      </td>
      <td style={{ padding: '4px 4px' }}>
        <select
          className="form-input"
          style={{ width: '100%', fontSize: 12, padding: '4px 4px' }}
          value={normalizeCostBaseUnit(component.unit)}
          onChange={e => onUnitChange(idx, e.target.value)}
        >
          {COST_BASE_UNITS.map(unit => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </td>
      <td style={{ padding: '4px 4px', textAlign: 'right', fontSize: 11 }}>
        {component.unitPrice != null ? (
          <span style={{ color: 'var(--text-2)' }}>
            {formatUnitPrice(component.unitPrice, normalizeCostBaseUnit(component.unit))}
          </span>
        ) : (
          <UnitPriceCell
            idx={idx}
            component={component}
            onOverride={typeof onUnitPriceOverride === 'function' ? onUnitPriceOverride : null}
          />
        )}
      </td>
      <td style={{ padding: '4px 4px', textAlign: 'right', fontSize: 11 }}>
        {subtotal != null ? (
          <span style={{ color: 'var(--text-2)' }}>{subtotal.toLocaleString()}원</span>
        ) : (
          <span style={{ color: 'var(--text-4)' }}>—</span>
        )}
      </td>
      <td style={{ padding: '4px 2px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {typeof onCopyRow === 'function' && (
            <button
              type="button"
              onClick={() => onCopyRow(idx)}
              title="행 복사"
              style={{
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--text-4)',
                padding: 2,
              }}
            >
              <Icon.copy style={{ width: 10, height: 10 }} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemoveRow(idx)}
            title="구성품 삭제"
            style={{
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-4)',
              padding: 2,
            }}
          >
            <Icon.close style={{ width: 10, height: 10 }} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function MenuRecipeComponentsTable({
  components,
  searchIdx,
  searchQ,
  suggestions,
  activeSuggestionIdx = -1,
  unitPriceMap,
  ingredientInputRefs,
  quantityInputRefs,
  onIngredientInputChange,
  onIngredientFocus,
  onIngredientBlur,
  onIngredientKeyDown,
  onPickSuggestion,
  onQuantityChange,
  onQuantityKeyDown,
  onUnitChange,
  onRemoveRow,
  onCopyRow,
  onUnitPriceOverride,
}) {
  if (components.length === 0) {
    return (
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-4)',
          textAlign: 'center',
          padding: '10px 0',
        }}
      >
        구성품이 없습니다. 구성품 추가 후 식자재를 검색해 입력하세요.
      </div>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--divider)' }}>
          <th
            style={{
              textAlign: 'left',
              padding: '4px 4px',
              fontWeight: 600,
              color: 'var(--text-3)',
            }}
          >
            식자재명
          </th>
          <th
            style={{
              width: 70,
              textAlign: 'right',
              padding: '4px 4px',
              fontWeight: 600,
              color: 'var(--text-3)',
            }}
          >
            수량
          </th>
          <th
            style={{
              width: 40,
              textAlign: 'right',
              padding: '4px 4px',
              fontWeight: 600,
              color: 'var(--text-3)',
            }}
          >
            단위
          </th>
          <th
            style={{
              width: 84,
              textAlign: 'right',
              padding: '4px 4px',
              fontWeight: 600,
              color: 'var(--text-3)',
            }}
          >
            단가
          </th>
          <th
            style={{
              width: 84,
              textAlign: 'right',
              padding: '4px 4px',
              fontWeight: 600,
              color: 'var(--text-3)',
            }}
          >
            원가
          </th>
          <th style={{ width: 44 }} />
        </tr>
      </thead>
      <tbody>
        {components.map((component, idx) => (
          <MenuRecipeTableRow
            key={component._key}
            component={component}
            idx={idx}
            searchIdx={searchIdx}
            searchQ={searchQ}
            suggestions={suggestions}
            activeSuggestionIdx={activeSuggestionIdx}
            unitPriceMap={unitPriceMap}
            ingredientInputRefs={ingredientInputRefs}
            quantityInputRefs={quantityInputRefs}
            onIngredientInputChange={onIngredientInputChange}
            onIngredientFocus={onIngredientFocus}
            onIngredientBlur={onIngredientBlur}
            onIngredientKeyDown={onIngredientKeyDown}
            onPickSuggestion={onPickSuggestion}
            onQuantityChange={onQuantityChange}
            onQuantityKeyDown={onQuantityKeyDown}
            onUnitChange={onUnitChange}
            onRemoveRow={onRemoveRow}
            onCopyRow={onCopyRow}
            onUnitPriceOverride={onUnitPriceOverride}
          />
        ))}
      </tbody>
    </table>
  );
}
