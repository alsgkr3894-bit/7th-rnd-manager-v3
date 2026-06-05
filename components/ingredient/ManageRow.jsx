import { memo } from 'react';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { getCategoryStyle, sortHashTags } from '@/lib/ingredient';
import { SCOPE_STYLES } from '@/lib/ingredient/constants';

export const ManageRow = memo(function ManageRow({ r, deletePending, onEdit, onCopy, onDeleteStart, onDeleteCancel, onDeleteConfirm, onRestore, batchMode, isSelected, onToggleSelect }) {
  const name = r.ingredientName || r.displayName || r.productName;
  const unitLabel = r.baseQuantity && r.baseUnitType
    ? `${formatNumber(r.baseQuantity)}${r.baseUnitType}`
    : (r.salesUnit || '-');
  const tags = sortHashTags(r.tags || []);
  // 일괄 삭제 대상은 단건 삭제와 동일 — productCode 없는 수동 항목만 (제때 연동 항목은 '숨김' 처리라 제외)
  const deletable = r.isManual && r.id != null && !r.productCode;

  return (
    <tr
      style={{ opacity: r.excluded ? .5 : 1, background: isSelected ? 'var(--accent-soft)' : r.excluded ? 'var(--surface-2)' : undefined, cursor: batchMode && !deletable ? 'default' : 'pointer' }}
      onClick={batchMode ? (deletable ? () => onToggleSelect?.(r.id) : undefined) : onEdit}
    >
      {batchMode && (
        <td style={{ width: 36, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          {deletable ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect?.(r.id)}
              style={{ cursor: 'pointer', width: 15, height: 15 }}
            />
          ) : (
            <span style={{ color: 'var(--text-4)', fontSize: 11 }} title="제때 연동 항목은 일괄 삭제 대상이 아니에요">–</span>
          )}
        </td>
      )}
      <td className="num" style={{ color: 'var(--text-3)', fontSize: 11 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
          <span>{r.productCode || (r.isManual ? '자체' : '-')}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
            background: r.jetteLinked ? 'var(--positive-soft)' : 'var(--surface-3)',
            color: r.jetteLinked ? 'var(--positive)' : 'var(--text-3)',
          }}>
            {r.jetteLinked ? '연동' : '수동'}
          </span>
        </div>
      </td>
      <td style={{ fontWeight: 600, fontSize: 13 }}>
        <span title={r.productName !== name ? `원본: ${r.productName}` : undefined}>{name}</span>
        {r.discontinued && (
          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'var(--surface-3)', color: 'var(--text-3)' }}>단종</span>
        )}
        {r.origin?.length > 0 && (
          <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'var(--positive-soft)', color: 'var(--positive)' }}>원산지</span>
        )}
        {r.allergens?.length > 0 && (
          <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'var(--warn-soft)', color: 'var(--warn)' }}>알레르기 {r.allergens.length}</span>
        )}
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.temperature || '-'}</td>
      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{unitLabel}</td>
      <td>
        <span style={{
          padding: '2px 7px', fontSize: 11, fontWeight: 600, borderRadius: 6,
          background: (SCOPE_STYLES[r.scope] || {}).bg || 'var(--surface-3)',
          color: (SCOPE_STYLES[r.scope] || {}).color || 'var(--text-2)',
        }}>
          {r.scope || '-'}
        </span>
      </td>
      <td className="num right" style={{ fontWeight: 600, fontSize: 12 }}>
        {r.priceWithTax != null ? <>{formatNumber(r.priceWithTax)}<span className="unit">원</span></> : '-'}
      </td>
      <td>
        {r.category
          ? <span className="chip" style={{ ...getCategoryStyle(r.category), padding: '2px 8px', fontSize: 11 }}>{r.category}</span>
          : <span className="chip" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', fontSize: 10, padding: '1px 6px' }}>미분류</span>}
      </td>
      <td>
        {tags.length > 0
          ? <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {tags.map(t => (
                <span key={t} style={{ padding: '1px 5px', fontSize: 10, fontWeight: 500, borderRadius: 3, background: 'var(--surface-2)', color: 'var(--text-2)' }}>#{t}</span>
              ))}
            </div>
          : <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>}
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.manufacturer || '-'}</td>
      {/* 액션 셀 — 클릭이 행 편집과 충돌하지 않도록 stopPropagation */}
      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        {r.excluded ? (
          <button className="btn sm" style={{ fontSize: 11 }} onClick={onRestore}>복원</button>
        ) : deletePending ? (
          <span style={{ display: 'flex', gap: 3 }}>
            <button className="btn sm"
              style={{ background: 'var(--negative)', color: '#fff', border: 'none', fontSize: 11 }}
              onClick={onDeleteConfirm}>
              {r.isManual && !r.productCode ? '삭제' : '숨김'}
            </button>
            <button className="btn sm" style={{ fontSize: 11 }} onClick={onDeleteCancel}>취소</button>
          </span>
        ) : (
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {onCopy && (
              <button className="btn sm" aria-label="복사해서 추가" title="이 항목을 복사해 새 식자재 추가" onClick={onCopy} style={{ color: 'var(--text-3)' }}>
                <Icon.copy style={{ width: 13, height: 13 }} />
              </button>
            )}
            <button className="btn sm" aria-label="삭제" onClick={onDeleteStart} style={{ color: 'var(--text-3)' }}>
              <Icon.trash style={{ width: 13, height: 13 }} />
            </button>
          </span>
        )}
      </td>
    </tr>
  );
});
