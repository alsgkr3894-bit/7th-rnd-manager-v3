'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';

export function SortableIngredientRow({
  id,
  line,
  index,
  info,
  hasPrice,
  sizeLabels,
  discontinued,
  onQtyChange,
  onRemove,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    background: isDragging ? 'var(--surface-2)' : undefined,
    borderBottom: '1px solid var(--divider)',
  };

  return (
    <tr ref={setNodeRef} style={style}>
      <td style={{ padding: '6px 2px', textAlign: 'center', width: 32 }}>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${line.ingredientName || index + 1} 식자재 순서 이동`}
          title="드래그로 순서 변경"
          style={{
            border: 0,
            background: 'transparent',
            cursor: isDragging ? 'grabbing' : 'grab',
            color: 'var(--text-4)',
            padding: '2px 4px',
            lineHeight: 1,
            fontSize: 15,
          }}
        >
          ≡
        </button>
      </td>
      <td style={{ padding: '6px 8px' }}>
        <div style={{ fontWeight: 500 }}>
          {line.ingredientName}
          {discontinued && (
            <span
              title="단종 식자재"
              style={{ color: 'var(--negative)', fontSize: 11, marginLeft: 4 }}
            >
              ⚠ 단종
            </span>
          )}
        </div>
        {!hasPrice && (
          <div style={{ fontSize: 10, color: 'var(--warn)', marginTop: 1 }}>⚠ 단가 미등록</div>
        )}
      </td>
      <td
        style={{
          padding: '6px 8px',
          textAlign: 'right',
          color: 'var(--text-3)',
          fontSize: 12,
        }}
      >
        {hasPrice
          ? `${info.unitPrice < 1 ? info.unitPrice.toFixed(2) : formatNumber(info.unitPrice)}원`
          : '—'}
      </td>
      {sizeLabels.map(sl => {
        const qty = line.quantities?.[sl] ?? '';
        const sub =
          hasPrice && parseFloat(qty) > 0
            ? Math.round(info.unitPrice * parseFloat(qty) * 10) / 10
            : null;
        return [
          <td key={sl + '_q'} style={{ padding: '4px 4px', width: 80 }}>
            <input
              className="form-input"
              type="number"
              min="0"
              value={qty}
              onChange={e => onQtyChange(index, sl, e.target.value)}
              placeholder="0"
              style={{ width: '100%', padding: '5px 8px', textAlign: 'right', fontSize: 13 }}
            />
          </td>,
          <td
            key={sl + '_s'}
            style={{
              padding: '4px 6px',
              textAlign: 'right',
              fontSize: 12,
              color: sub != null ? 'var(--text-1)' : 'var(--text-4)',
              fontWeight: sub != null ? 600 : undefined,
              width: 60,
            }}
          >
            {sub != null ? `${formatNumber(sub)}원` : '—'}
          </td>,
        ];
      })}
      <td style={{ padding: '6px 4px', fontSize: 12, color: 'var(--text-3)' }}>{line.unitType}</td>
      <td style={{ padding: '6px 2px', textAlign: 'center' }}>
        <button
          onClick={() => onRemove(index)}
          aria-label={`${line.ingredientName} 식자재 삭제`}
          style={{
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-4)',
            padding: '2px',
          }}
        >
          <Icon.close style={{ width: 11, height: 11 }} />
        </button>
      </td>
    </tr>
  );
}
