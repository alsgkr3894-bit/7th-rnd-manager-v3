'use client';
import { Toggle } from '@/components/ui/Toggle';
import { TYPE_OPTIONS, inputStyle } from './managed-products-constants';

/**
 * ManagedProductsRow — 대상 제품 테이블 행
 *
 * @param {object}   p
 * @param {Function} onToggleEnable    - (p) => void
 * @param {Function} onChangeType      - (p, type) => void
 * @param {Function} onToggleManaged   - (p) => void
 * @param {Function} onDelete          - (id) => void
 */
export function ManagedProductsRow({ p, onToggleEnable, onChangeType, onToggleManaged, onDelete }) {
  return (
    <tr style={{opacity: p.enable === false ? 0.5 : 1}}>
      <td className="num" style={{color:'var(--text-3)', fontSize:12}}>{p.productCode || '-'}</td>
      <td className="cell-name"><div className="menu-name">{p.productName}</div></td>
      <td style={{textAlign:'center'}}>
        <Toggle value={p.enable !== false} onChange={() => onToggleEnable(p)}/>
      </td>
      <td>
        <select
          value={p.productType || 'generic'}
          onChange={e => onChangeType(p, e.target.value)}
          style={{...inputStyle, width:'100%'}}
        >
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>
      <td style={{textAlign:'center'}}>
        <input
          type="checkbox"
          checked={!!p.isManaged}
          onChange={() => onToggleManaged(p)}
          style={{cursor:'pointer', width:16, height:16}}
        />
      </td>
      <td style={{textAlign:'right'}}>
        <button className="btn sm" style={{color:'var(--negative)'}} onClick={() => onDelete(p.id)}>삭제</button>
      </td>
    </tr>
  );
}
