'use client';
import { memo } from 'react';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { componentSubtotal } from '@/lib/cost/shared/calc';
import { UNIT_OPTIONS } from '@/lib/cost/shared/unit-options';

const noop = () => {};

export const ComponentRow = memo(function ComponentRow({
  c = {},
  onChange = noop,
  onRemove = noop,
  ingredients = [],
  listId,
}) {
  const subtotal = componentSubtotal(c);
  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];

  function handleNameChange(value) {
    onChange({ ingredientName: value });
    // 입력값이 ingredients에 정확히 매칭되면 productCode/unit/unitPrice 자동 채움
    const match = safeIngredients.find(i =>
      i.ingredientName === value || i.productName === value
    );
    if (match) {
      onChange({
        ingredientName: match.ingredientName || match.productName,
        productCode:    match.productCode || null,
        unit:           c.unit || match.baseUnitType || 'g',
        unitPrice:      match.unitPrice ?? c.unitPrice ?? null,
      });
    }
  }

  return (
    <div style={{
      display:'grid',
      gridTemplateColumns: '1fr 80px 64px 100px 100px 28px',
      gap:6, alignItems:'center', fontSize:12,
    }}>
      <input className="form-input" value={c.ingredientName || ''}
        list={listId}
        onChange={e => handleNameChange(e.target.value)}
        placeholder="재료명 (예: 도우 L)"
        style={{fontSize:13}}/>

      <input className="form-input" type="number" min="0" step="any" value={c.quantity ?? ''}
        onChange={e => onChange({ quantity: e.target.value })}
        placeholder="수량" style={{textAlign:'right'}}/>

      <select className="form-input" value={c.unit || 'g'}
        onChange={e => onChange({ unit: e.target.value })}>
        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>

      <input className="form-input" type="number" min="0" step="any" value={c.unitPrice ?? ''}
        onChange={e => onChange({ unitPrice: e.target.value })}
        placeholder="단가" style={{textAlign:'right'}}/>

      <div style={{textAlign:'right', fontWeight:600, color: subtotal < 0 ? 'var(--negative)' : subtotal > 0 ? 'var(--text-1)' : 'var(--text-4)'}}>
        {Number.isFinite(subtotal) && subtotal !== 0 ? `${formatNumber(Math.round(subtotal))}원` : '—'}
      </div>

      <button type="button" onClick={onRemove}
        style={{
          background:'transparent', border:'none', padding:4, cursor:'pointer',
          color:'var(--text-4)', display:'inline-flex',
        }}>
        <Icon.close style={{width:14, height:14}}/>
      </button>
    </div>
  );
});
