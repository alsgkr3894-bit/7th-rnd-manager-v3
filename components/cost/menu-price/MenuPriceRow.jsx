'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';

export function MenuPriceRow({ r, deletePending, onEdit, onDeleteStart, onDeleteCancel, onDeleteConfirm }) {
  return (
    <tr>
      <td>
        {r.category
          ? <span className="chip" style={{padding:'2px 8px', fontSize:11}}>{r.category}</span>
          : <span style={{color:'var(--text-4)', fontSize:11}}>—</span>}
      </td>
      <td style={{fontWeight:600, fontSize:13}}>{r.menuName}</td>
      <td style={{fontSize:12, color:'var(--text-2)'}}>{r.size || '단일'}</td>
      <td className="num right" style={{fontWeight:700, fontSize:13}}>
        {r.price != null ? <>{formatNumber(r.price)}<span className="unit">원</span></> : '-'}
      </td>
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
