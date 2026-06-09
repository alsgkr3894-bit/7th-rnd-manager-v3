'use client';
import { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '@/components/icons';
import { useModalShell } from '@/hooks/useModalShell';
import { HOME_WIDGET_ROWS } from '@/hooks/useWidgetConfig';
import { asStringArray } from '@/lib/ui/prop-guards';

function SortableRow({ row, isVisible, onToggleRow, isFavorite, onToggleFavorite }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const rowKeys = asStringArray(row.keys);
  const allVisible = rowKeys.every(k => isVisible?.(k));
  const handleToggle = () => onToggleRow?.(rowKeys);
  const fav = Boolean(isFavorite?.(row.id));

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'default' }}
    >
      {/* 드래그 핸들 */}
      <span
        {...attributes}
        {...listeners}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', color: 'var(--text-4)', flexShrink: 0, lineHeight: 1, padding: '2px 0' }}
        title="드래그로 순서 변경"
      >
        ≡
      </span>

      <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1 }}>{row.label}</span>

      {/* 즐겨찾기 토글 */}
      <button
        type="button"
        onClick={() => onToggleFavorite?.(row.id)}
        aria-pressed={fav}
        title={fav ? '즐겨찾기 해제' : '즐겨찾기 (상단 고정)'}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', padding: 2,
          color: fav ? 'var(--accent)' : 'var(--text-4)',
        }}
      >
        {fav
          ? <Icon.starFill style={{ width: 16, height: 16 }} />
          : <Icon.star style={{ width: 16, height: 16 }} />}
      </button>

      {/* 표시 토글 */}
      <label style={{ cursor: 'pointer', flexShrink: 0 }}>
        <input type="checkbox" checked={allVisible} onChange={handleToggle}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
        <div style={{
          width: 38, height: 22, borderRadius: 11,
          background: allVisible ? 'var(--accent)' : 'var(--border-strong)',
          transition: 'background .15s', position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 3,
            left: allVisible ? 18 : 3,
            width: 16, height: 16, borderRadius: 8,
            background: '#fff', transition: 'left .15s',
            boxShadow: 'var(--shadow-sm)',
          }} />
        </div>
      </label>
    </div>
  );
}

/**
 * 홈 위젯 표시/숨김 + 드래그 순서 설정 모달.
 */
export function WidgetConfigModal({ isVisible, toggleRow, onClose, widgetOrder, onReorder, isFavorite, onToggleFavorite, onReset }) {
  const { containerRef, isClosing, close } = useModalShell(onClose);
  const [localOrder, setLocalOrder] = useState(() => {
    const savedOrder = asStringArray(widgetOrder);
    return savedOrder.length > 0 ? savedOrder : HOME_WIDGET_ROWS.map(r => r.id);
  });

  const rowMap = Object.fromEntries(HOME_WIDGET_ROWS.map(r => [r.id, r]));
  const orderedRows = localOrder.map(id => rowMap[id]).filter(Boolean);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localOrder.indexOf(active.id);
    const newIdx = localOrder.indexOf(over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const newOrder = arrayMove(localOrder, oldIdx, newIdx);
    setLocalOrder(newOrder);
    onReorder?.(newOrder);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 500, display: 'grid', placeItems: 'center', animation: 'fade 150ms ease' }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div ref={containerRef} className={'card modal-anim' + (isClosing ? ' modal-exit' : '')} style={{ width: 'min(380px,92vw)', padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-1)' }}>홈 위젯 설정</div>
          <button className="btn xs" aria-label="설정 닫기" onClick={close}>
            <Icon.close style={{ width: 15, height: 15 }} />
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 14 }}>≡ 드래그로 순서 변경 · ⭐ 즐겨찾기는 상단 고정</div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localOrder} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {orderedRows.map(row => (
                <SortableRow key={row.id} row={row} isVisible={isVisible} onToggleRow={toggleRow}
                  isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <div style={{ marginTop: 14, borderTop: '1px solid var(--divider)', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-4)' }}>순서·즐겨찾기·접기 설정은 이 브라우저에만 저장</span>
          {onReset && (
            <button
              type="button"
              className="btn sm"
              style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}
              onClick={() => { onReset(); close(); }}
              title="모든 위젯 설정을 기본값으로 되돌립니다"
            >
              기본값 복원
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
