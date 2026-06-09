'use client';
import { TYPE_OPTIONS, inputStyle } from './managed-products-constants';
import { asDisplayText } from '@/lib/ui/prop-guards';

const EMPTY_FORM = { productCode: '', productName: '', productType: 'generic', isManaged: false };
const noop = () => {};
const TYPE_VALUES = new Set(TYPE_OPTIONS.map(option => option.value));

/**
 * ManagedProductsForm — 대상 제품 추가 폼
 *
 * @param {object}   form        - { productCode, productName, productType, isManaged }
 * @param {Function} setForm
 * @param {boolean}  busy        - 제출 중
 * @param {Function} onSubmit
 * @param {Function} onCancel
 */
export function ManagedProductsForm({
  form = EMPTY_FORM,
  setForm = noop,
  busy,
  onSubmit = noop,
  onCancel = noop,
}) {
  const rawForm = { ...EMPTY_FORM, ...(form && typeof form === 'object' ? form : {}) };
  const rawProductType = asDisplayText(rawForm.productType, EMPTY_FORM.productType);
  const safeForm = {
    productCode: asDisplayText(rawForm.productCode),
    productName: asDisplayText(rawForm.productName),
    productType: TYPE_VALUES.has(rawProductType) ? rawProductType : EMPTY_FORM.productType,
    isManaged: Boolean(rawForm.isManaged),
  };
  const updateForm = typeof setForm === 'function' ? setForm : noop;
  const handleSubmit = typeof onSubmit === 'function' ? onSubmit : noop;
  const handleCancel = typeof onCancel === 'function' ? onCancel : noop;
  const canSubmit = !!safeForm.productCode.trim() && !!safeForm.productName.trim();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '150px 1fr 130px 110px auto auto',
        gap: 8,
        marginBottom: 12,
        alignItems: 'center',
      }}
    >
      <input
        value={safeForm.productCode}
        onChange={e => updateForm({ ...safeForm, productCode: e.target.value })}
        placeholder="제품코드 (필수)"
        style={inputStyle}
      />
      <input
        value={safeForm.productName}
        onChange={e => updateForm({ ...safeForm, productName: e.target.value })}
        placeholder="제품명 (필수)"
        style={inputStyle}
      />
      <select
        value={safeForm.productType}
        onChange={e => updateForm({ ...safeForm, productType: e.target.value })}
        style={inputStyle}
      >
        {TYPE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--text-2)',
        }}
      >
        <input
          type="checkbox"
          checked={safeForm.isManaged}
          onChange={e => updateForm({ ...safeForm, isManaged: e.target.checked })}
        />
        관리품목
      </label>
      <button className="btn sm" onClick={handleCancel} disabled={busy}>
        취소
      </button>
      <button className="btn sm primary" onClick={handleSubmit} disabled={busy || !canSubmit}>
        {busy ? '추가 중...' : '추가'}
      </button>
    </div>
  );
}
