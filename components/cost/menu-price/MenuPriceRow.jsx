'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { InlineEditCell } from '@/components/cost/manage/table-utils';

export function MenuPriceRow({
  r, deletePending, onEdit, onDeleteStart, onDeleteCancel, onDeleteConfirm,
  selected = false, onToggleSelect, onInlineSave,
}) {
  return (
    <tr>
      {onToggleSelect && (
        <td>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            style={{ width: 15, height: 15, accentColor: 'var(--accent)' }}
          />
        </td>
      )}
      <InlineEditCell value={r.menuCode || ''} required onSave={value => onInlineSave?.(r, { menuCode: value })} />
      <InlineEditCell
        value={r.category || ''}
        onSave={value => onInlineSave?.(r, { category: value })}
        formatter={value => value
          ? <span className="chip" style={{padding:'2px 8px', fontSize:11}}>{value}</span>
          : <span style={{color:'var(--text-4)', fontSize:11}}>—</span>}
      />
      <InlineEditCell
        value={r.menuName || ''}
        required
        onSave={value => onInlineSave?.(r, { menuName: value })}
        formatter={value => <span style={{fontWeight:600, fontSize:13}}>{value}</span>}
      />
      <td style={{fontSize:12, color:'var(--text-2)'}}>{r.size || '단일'}</td>
      <InlineEditCell
        value={r.price ?? ''}
        type="number"
        align="right"
        required
        onSave={value => onInlineSave?.(r, { price: value })}
        formatter={value => value != null && value !== '' ? <>{formatNumber(value)}<span className="unit">원</span></> : '-'}
      />
      <td style={{fontSize:12, color:'var(--text-3)'}}>{r.note || <span style={{opacity:.3}}>—</span>}</td>
      <td style={{textAlign:'center'}}>
        {deletePending ? (
          <span style={{display:'flex', gap:3, justifyContent:'center'}}>
            <button className="btn sm"
              style={{background:'var(--negative)', color:'#fff', border:'none', fontSize:11}}
              onClick={onDeleteConfirm}>삭제</button>
            <button className="btn sm" style={{fontSize:11}} onClick={onDeleteCancel}>취소</button>
          </span>
        ) : (
          <span style={{display:'flex', gap:4, justifyContent:'center'}}>
            <button className="btn sm" onClick={onEdit}>
              <Icon.edit style={{width:13, height:13}}/>
            </button>
            <button className="btn sm" onClick={onDeleteStart} style={{color:'var(--text-3)'}}>
              <Icon.trash style={{width:13, height:13}}/>
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}
