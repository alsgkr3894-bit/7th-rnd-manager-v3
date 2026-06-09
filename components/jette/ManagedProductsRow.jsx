'use client';
import { Toggle } from '@/components/ui/Toggle';
import { InlineConfirmButtons } from '@/components/ui/InlineConfirmButtons';
import { TYPE_OPTIONS, inputStyle } from './managed-products-constants';
import { asDisplayText } from '@/lib/ui/prop-guards';

const noop = () => {};
const TYPE_VALUES = new Set(TYPE_OPTIONS.map(option => option.value));

/**
 * ManagedProductsRow — 대상 제품 테이블 행
 *
 * @param {object}   p
 * @param {Function} onToggleEnable    - (p) => void
 * @param {Function} onChangeType      - (p, type) => void
 * @param {Function} onToggleManaged   - (p) => void
 * @param {boolean}  pendingDelete
 * @param {Function} onAskDelete
 * @param {Function} onCancelDelete
 * @param {Function} onConfirmDelete
 */
export function ManagedProductsRow({
  product = {},
  onToggleEnable = noop,
  onChangeType = noop,
  onToggleManaged = noop,
  pendingDelete,
  onAskDelete = noop,
  onCancelDelete = noop,
  onConfirmDelete = noop,
}) {
  const safeProduct = product && typeof product === 'object' ? product : {};
  const productCode = asDisplayText(safeProduct.productCode, '-');
  const productName = asDisplayText(safeProduct.productName, '-');
  const rawProductType = asDisplayText(safeProduct.productType, 'generic');
  const productType = TYPE_VALUES.has(rawProductType) ? rawProductType : 'generic';
  const handleToggleEnable = typeof onToggleEnable === 'function' ? onToggleEnable : noop;
  const handleChangeType = typeof onChangeType === 'function' ? onChangeType : noop;
  const handleToggleManaged = typeof onToggleManaged === 'function' ? onToggleManaged : noop;
  const handleAskDelete = typeof onAskDelete === 'function' ? onAskDelete : noop;
  const handleCancelDelete = typeof onCancelDelete === 'function' ? onCancelDelete : noop;
  const handleConfirmDelete = typeof onConfirmDelete === 'function' ? onConfirmDelete : noop;

  return (
    <tr style={{opacity: safeProduct.enable === false ? 0.5 : 1}}>
      <td className="num" style={{color:'var(--text-3)', fontSize:12}}>{productCode}</td>
      <td className="cell-name"><div className="menu-name">{productName}</div></td>
      <td style={{textAlign:'center'}}>
        <Toggle value={safeProduct.enable !== false} onChange={() => handleToggleEnable(safeProduct)}/>
      </td>
      <td>
        <select
          value={productType}
          onChange={e => handleChangeType(safeProduct, e.target.value)}
          style={{...inputStyle, width:'100%'}}
        >
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </td>
      <td style={{textAlign:'center'}}>
        <input
          type="checkbox"
          checked={Boolean(safeProduct.isManaged)}
          onChange={() => handleToggleManaged(safeProduct)}
          style={{cursor:'pointer', width:16, height:16}}
        />
      </td>
      <td style={{textAlign:'right'}}>
        {pendingDelete ? (
          <InlineConfirmButtons
            message="제품을 삭제할까요?"
            onCancel={handleCancelDelete}
            onConfirm={handleConfirmDelete}
          />
        ) : (
          <button className="btn sm" style={{color:'var(--negative)'}} onClick={handleAskDelete}>삭제</button>
        )}
      </td>
    </tr>
  );
}
