'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '@/components/icons';
import { formatUnitPrice } from '@/lib/format';
import { COST_BASE_UNITS, normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import {
  hasRecipeComponentIdentity,
  isRecipeComponentMissingQuantity,
} from '@/components/menu-master/recipeComponentRows';
import { SuggestionItem } from './SuggestionItem';
import { UnitPriceCell } from './UnitPriceCell';

export function MenuRecipeTableRow({
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
  // 레시피출력 순서를 바꾸는 용도의 드래그 핸들. null이면 드래그 비활성(단가없음
  // 필터 등으로 화면 순서가 원본과 달라졌을 때) — MenuRecipeComponentsTable 참고.
  dragHandleId = null,
}) {
  const subtotal =
    component.unitPrice != null && Number(component.quantity) > 0
      ? Math.round(component.unitPrice * Number(component.quantity))
      : null;
  const quantityNeedsCheck =
    hasRecipeComponentIdentity(component) && isRecipeComponentMissingQuantity(component);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dragHandleId || component._key,
    disabled: !dragHandleId,
  });
  const rowStyle = {
    borderBottom: '1px solid var(--divider)',
    ...(dragHandleId
      ? {
          transform: CSS.Transform.toString(transform),
          transition,
          background: isDragging ? 'var(--accent-soft)' : undefined,
          position: 'relative',
          zIndex: isDragging ? 1 : undefined,
        }
      : null),
  };

  return (
    <tr ref={dragHandleId ? setNodeRef : undefined} style={rowStyle}>
      {dragHandleId && (
        <td style={{ padding: '7px 2px', textAlign: 'center', width: 28 }}>
          <span
            {...attributes}
            {...listeners}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              color: 'var(--text-4)',
              display: 'inline-block',
              lineHeight: 1,
              padding: '4px 2px',
              touchAction: 'none',
            }}
            title="드래그로 순서 변경 (레시피출력 순서에 반영됩니다)"
          >
            ⠿
          </span>
        </td>
      )}
      <td style={{ padding: '7px 8px', position: 'relative' }}>
        <input
          ref={el => {
            if (ingredientInputRefs) {
              if (el) ingredientInputRefs.current[component._key] = el;
              else delete ingredientInputRefs.current[component._key];
            }
          }}
          className="form-input"
          style={{ width: '100%', height: 34, fontSize: 13, padding: '6px 8px' }}
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
              borderRadius: 8,
              zIndex: 50,
              maxHeight: 220,
              overflowY: 'auto',
              boxShadow: 'var(--shadow-md)',
            }}
          >
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
      <td style={{ padding: '7px 6px' }}>
        <input
          ref={el => {
            if (quantityInputRefs) {
              if (el) quantityInputRefs.current[component._key] = el;
              else delete quantityInputRefs.current[component._key];
            }
          }}
          className="form-input"
          type="number"
          min="0.000001"
          step="any"
          style={{
            width: '100%',
            height: 34,
            fontSize: 13,
            padding: '6px 8px',
            textAlign: 'right',
            borderColor: quantityNeedsCheck ? 'var(--warn)' : undefined,
          }}
          value={component.quantity ?? ''}
          onChange={e => onQuantityChange(idx, e.target.value)}
          onKeyDown={e => onQuantityKeyDown?.(idx, e)}
          placeholder="0"
          title={
            quantityNeedsCheck
              ? '수량은 0보다 큰 숫자로 입력하세요'
              : '수량 입력 후 Enter로 다음 구성품'
          }
        />
      </td>
      <td style={{ padding: '7px 6px' }}>
        <select
          className="form-input"
          style={{ width: '100%', height: 34, fontSize: 13, padding: '6px 6px' }}
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
      <td style={{ padding: '7px 6px', textAlign: 'right', fontSize: 12 }}>
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
      <td style={{ padding: '7px 6px', textAlign: 'right', fontSize: 12 }}>
        {subtotal != null ? (
          <span style={{ color: 'var(--text-2)' }}>{subtotal.toLocaleString()}원</span>
        ) : (
          <span style={{ color: 'var(--text-4)' }}>—</span>
        )}
      </td>
      <td style={{ padding: '7px 6px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          {typeof onCopyRow === 'function' && (
            <button
              type="button"
              onClick={() => onCopyRow(idx)}
              title="행 복사"
              style={{
                border: 0,
                background: 'var(--surface-2)',
                borderRadius: 6,
                cursor: 'pointer',
                color: 'var(--text-4)',
                padding: 5,
              }}
            >
              <Icon.copy style={{ width: 12, height: 12 }} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemoveRow(idx)}
            title="구성품 삭제"
            style={{
              border: 0,
              background: 'var(--surface-2)',
              borderRadius: 6,
              cursor: 'pointer',
              color: 'var(--text-4)',
              padding: 5,
            }}
          >
            <Icon.close style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </td>
    </tr>
  );
}
