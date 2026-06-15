'use client';

import { FieldLabel } from '@/components/menu-master/MenuMasterFieldPrimitives';

export function PriceField({ value, error, defaultPrice, setField }) {
  return (
    <div>
      <FieldLabel>
        판매가 (부가세 포함)
        {defaultPrice && (
          <span style={{ marginLeft: 8, color: 'var(--text-4)' }}>
            기본가 {defaultPrice.toLocaleString()}원
          </span>
        )}
      </FieldLabel>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input"
          type="number"
          min="0"
          value={value}
          aria-describedby={error ? 'menu-master-price-error' : undefined}
          onChange={e => setField('price', e.target.value)}
          placeholder={defaultPrice ? String(defaultPrice) : '직접 입력'}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>원</span>
        {defaultPrice && !value && (
          <button className="btn sm" onClick={() => setField('price', String(defaultPrice))}>
            기본가 적용
          </button>
        )}
      </div>
      {error && (
        <div
          id="menu-master-price-error"
          style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export function StatusField({ value, setField }) {
  return (
    <div>
      <FieldLabel>상태</FieldLabel>
      <select className="input" value={value} onChange={e => setField('status', e.target.value)}>
        <option value="active">활성</option>
        <option value="discontinued">단종</option>
        <option value="test">테스트</option>
      </select>
    </div>
  );
}

export function NoteField({ value, setField }) {
  return (
    <div>
      <FieldLabel>비고</FieldLabel>
      <input
        className="input"
        value={value}
        onChange={e => setField('note', e.target.value)}
        placeholder="선택 입력"
      />
    </div>
  );
}

export function OriginAllergenExcludeField({ value, setField }) {
  return (
    <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        <input
          type="checkbox"
          checked={value}
          onChange={e => setField('excludeFromOrigin', e.target.checked)}
          style={{ accentColor: 'var(--warn)', width: 15, height: 15 }}
        />
        <span style={{ fontWeight: 600 }}>원산지·알레르기 출력에서 제외</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          (패밀리박스·하프앤하프 등 공통 구성품이 겹치는 메뉴)
        </span>
      </label>
    </div>
  );
}
