'use client';
import { TYPE_OPTIONS, inputStyle } from './managed-products-constants';

/**
 * ManagedProductsForm — 대상 제품 추가 폼
 *
 * @param {object}   form        - { productCode, productName, productType, isManaged }
 * @param {Function} setForm
 * @param {boolean}  busy        - 제출 중
 * @param {Function} onSubmit
 * @param {Function} onCancel
 */
export function ManagedProductsForm({ form, setForm, busy, onSubmit, onCancel }) {
  const canSubmit = !!form.productCode.trim() && !!form.productName.trim();

  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'150px 1fr 130px 110px auto auto',
      gap:8, marginBottom:12, alignItems:'center',
    }}>
      <input
        value={form.productCode}
        onChange={e => setForm({...form, productCode: e.target.value})}
        placeholder="제품코드 (필수)"
        style={inputStyle}
      />
      <input
        value={form.productName}
        onChange={e => setForm({...form, productName: e.target.value})}
        placeholder="제품명 (필수)"
        style={inputStyle}
      />
      <select
        value={form.productType}
        onChange={e => setForm({...form, productType: e.target.value})}
        style={inputStyle}
      >
        {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <label style={{display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--text-2)'}}>
        <input
          type="checkbox"
          checked={form.isManaged}
          onChange={e => setForm({...form, isManaged: e.target.checked})}
        />
        관리품목
      </label>
      <button className="btn sm" onClick={onCancel} disabled={busy}>취소</button>
      <button
        className="btn sm primary"
        onClick={onSubmit}
        disabled={busy || !canSubmit}
      >
        {busy ? '추가 중...' : '추가'}
      </button>
    </div>
  );
}
