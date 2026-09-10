'use client';

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MenuRecipeTableRow } from '@/components/menu-master/recipe';

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
  onReorderRows,
  // 단가없음 등으로 필터링된 화면에서는 순서가 원본 배열과 달라 보여
  // 드래그 결과가 혼란스러울 수 있으므로 그럴 때는 드래그를 막는다.
  reorderDisabled = false,
  emptyMessage = '구성품이 없습니다. 구성품 추가 후 식자재를 검색해 입력하세요.',
}) {
  const canReorder = typeof onReorderRows === 'function' && !reorderDisabled;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderRows(active.id, over.id);
  }
  if (components.length === 0) {
    return (
      <div
        style={{
          border: '1px dashed var(--border)',
          borderRadius: 8,
          background: 'var(--surface-2)',
          fontSize: 13,
          color: 'var(--text-3)',
          textAlign: 'center',
          padding: '18px 12px',
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid var(--divider)',
        borderRadius: 8,
        overflowX: 'auto',
        background: 'var(--surface)',
      }}
    >
      <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--divider)', background: 'var(--surface-2)' }}>
            {canReorder && <th style={{ width: 28 }} aria-hidden="true" />}
            <th
              style={{
                textAlign: 'left',
                padding: '8px 8px',
                fontWeight: 700,
                color: 'var(--text-3)',
              }}
            >
              식자재명
            </th>
            <th
              style={{
                width: 90,
                textAlign: 'right',
                padding: '8px 6px',
                fontWeight: 700,
                color: 'var(--text-3)',
              }}
            >
              수량
            </th>
            <th
              style={{
                width: 58,
                textAlign: 'right',
                padding: '8px 6px',
                fontWeight: 700,
                color: 'var(--text-3)',
              }}
            >
              단위
            </th>
            <th
              style={{
                width: 104,
                textAlign: 'right',
                padding: '8px 6px',
                fontWeight: 700,
                color: 'var(--text-3)',
              }}
            >
              단가
            </th>
            <th
              style={{
                width: 104,
                textAlign: 'right',
                padding: '8px 6px',
                fontWeight: 700,
                color: 'var(--text-3)',
              }}
            >
              원가
            </th>
            <th style={{ width: 60 }} />
          </tr>
        </thead>
        <tbody>
          <DndContext
            sensors={canReorder ? sensors : undefined}
            collisionDetection={closestCenter}
            onDragEnd={canReorder ? handleDragEnd : undefined}
          >
            <SortableContext
              items={components.map(c => c._key)}
              strategy={verticalListSortingStrategy}
            >
              {components.map((component, idx) => {
                const sourceIdx = Number.isInteger(component._sourceIdx)
                  ? component._sourceIdx
                  : idx;
                return (
                  <MenuRecipeTableRow
                    key={component._key}
                    component={component}
                    idx={sourceIdx}
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
                    dragHandleId={canReorder ? component._key : null}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </tbody>
      </table>
    </div>
  );
}
