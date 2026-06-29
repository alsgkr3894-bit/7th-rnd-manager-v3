'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';

function ingredientManageHref(component) {
  const params = new URLSearchParams();
  const name = String(component?.ingredientName || '').trim();
  const productCode = String(component?.productCode || '').trim();
  if (name) params.set('query', name);
  if (productCode) params.set('productCode', productCode);
  const query = params.toString();
  return query ? `/ingredient/manage?${query}` : '/ingredient/manage';
}

export function UnitPriceCell({ idx, component, onOverride }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  if (!editing) {
    return (
      <span
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 2,
          lineHeight: 1.1,
        }}
      >
        <button
          type="button"
          title={
            onOverride ? '클릭하여 레시피 임시 단가 직접 입력' : '식자재 관리에서 단가를 설정하세요'
          }
          style={{
            background: 'none',
            border: 'none',
            cursor: onOverride ? 'pointer' : 'default',
            color: 'var(--warn)',
            fontSize: 11,
            padding: 0,
            textDecoration: onOverride ? 'underline dotted' : 'none',
          }}
          onClick={() => {
            if (!onOverride) return;
            setValue('');
            setEditing(true);
          }}
        >
          단가 없음
        </button>
        <a
          href={ingredientManageHref(component)}
          title="식자재 관리에서 원본 단가 보정"
          style={{
            color: 'var(--accent-text)',
            fontSize: 10,
            textDecoration: 'underline',
            whiteSpace: 'nowrap',
          }}
        >
          단가 보정
        </a>
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <input
        autoFocus
        type="number"
        min="0"
        step="1"
        placeholder="단가/g"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            const n = Number(value);
            if (value !== '' && n >= 0) {
              onOverride(idx, n);
            }
            setEditing(false);
          }
          if (e.key === 'Escape') setEditing(false);
        }}
        style={{
          width: 64,
          fontSize: 11,
          padding: '2px 4px',
          border: '1px solid var(--primary)',
          borderRadius: 3,
          textAlign: 'right',
        }}
      />
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: 'var(--text-4)',
        }}
        onClick={() => setEditing(false)}
      >
        <Icon.close style={{ width: 9, height: 9 }} />
      </button>
    </span>
  );
}
