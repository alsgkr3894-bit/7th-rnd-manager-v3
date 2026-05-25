'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';

export const DEFAULT_CATEGORIES = [
  '치즈류', '소스류', '도우/밀가루', '채소류', '육류/가공육',
  '수산류', '박스/포장재', '음료', '향신료', '기타',
];

const UNIT_TYPES = ['g', 'kg', 'L', 'ml', '개', '캔', '팩', '봉', '병'];

const EMPTY = {
  ingredientName: '', productCode: '', category: '',
  baseQuantity: '', baseUnitType: 'g', taxType: '과세',
  priceOverride: '', note: '',
};

/**
 * IngredientForm — 식자재 추가/수정 모달
 * @prop {object|null} initial  수정 시 기존 레코드, null이면 추가
 * @prop {Function}    onSave   (formData) => Promise<void>
 * @prop {Function}    onClose
 */
export function IngredientForm({ initial, onSave, onClose }) {
  const [form, setForm]     = useState(initial ? toForm(initial) : EMPTY);
  const [customCat, setCustomCat] = useState(!DEFAULT_CATEGORIES.includes(initial?.category || '') && !!initial?.category);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function validate() {
    const e = {};
    if (!form.ingredientName.trim()) e.ingredientName = '재료명을 입력하세요';
    if (form.baseQuantity && isNaN(Number(form.baseQuantity))) e.baseQuantity = '숫자만 입력하세요';
    if (form.priceOverride && isNaN(Number(form.priceOverride))) e.priceOverride = '숫자만 입력하세요';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        baseQuantity:  form.baseQuantity  ? Number(form.baseQuantity)  : null,
        priceOverride: form.priceOverride ? Number(form.priceOverride) : null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.4)',
      display:'grid', placeItems:'center', zIndex:200,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{
        width:'min(520px, 95vw)', maxHeight:'90vh', overflowY:'auto',
        padding:'24px 28px', position:'relative',
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
          <div style={{fontWeight:700, fontSize:16}}>{initial ? '식자재 수정' : '식자재 추가'}</div>
          <button className="btn" style={{padding:'4px 8px'}} onClick={onClose}>
            <Icon.close style={{width:16, height:16}}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:16}}>

          {/* 재료명 */}
          <Field label="재료명" required error={errors.ingredientName}>
            <input className="form-input" value={form.ingredientName}
              onChange={e => set('ingredientName', e.target.value)}
              placeholder="예) 모짜렐라치즈"/>
          </Field>

          {/* 분류 */}
          <Field label="분류">
            <div style={{display:'flex', gap:6, alignItems:'center'}}>
              {customCat ? (
                <input className="form-input" value={form.category}
                  onChange={e => set('category', e.target.value)}
                  placeholder="직접 입력" style={{flex:1}}/>
              ) : (
                <select className="form-input" value={form.category}
                  onChange={e => set('category', e.target.value)} style={{flex:1}}>
                  <option value="">미분류</option>
                  {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <button type="button" className="btn" style={{whiteSpace:'nowrap', flexShrink:0}}
                onClick={() => { setCustomCat(v => !v); set('category', ''); }}>
                {customCat ? '목록에서 선택' : '직접 입력'}
              </button>
            </div>
          </Field>

          {/* 제때 제품코드 */}
          <Field label="제때 제품코드" hint="제때 가격 파일과 자동 연동됩니다">
            <input className="form-input" value={form.productCode}
              onChange={e => set('productCode', e.target.value)}
              placeholder="예) PRD-001 (없으면 비워두세요)"/>
          </Field>

          {/* 포장단위 */}
          <Field label="포장단위" hint="g당 단가 자동 계산에 사용" error={errors.baseQuantity}>
            <div style={{display:'flex', gap:8}}>
              <input className="form-input" type="number" value={form.baseQuantity}
                onChange={e => set('baseQuantity', e.target.value)}
                placeholder="예) 1000" style={{flex:1}}/>
              <select className="form-input" value={form.baseUnitType}
                onChange={e => set('baseUnitType', e.target.value)} style={{width:80}}>
                {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </Field>

          {/* 과세구분 */}
          <Field label="과세구분">
            <div style={{display:'flex', gap:8}}>
              {['과세', '면세'].map(t => (
                <label key={t} style={{display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:14}}>
                  <input type="radio" value={t} checked={form.taxType === t}
                    onChange={() => set('taxType', t)} style={{accentColor:'var(--accent)'}}/>
                  {t}
                </label>
              ))}
            </div>
          </Field>

          {/* 수동 단가 */}
          <Field label="수동 단가 (부가세포함)" hint="제때 연동 없을 때 사용" error={errors.priceOverride}>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <input className="form-input" type="number" value={form.priceOverride}
                onChange={e => set('priceOverride', e.target.value)}
                placeholder="예) 7680" style={{flex:1}}/>
              <span style={{fontSize:13, color:'var(--text-3)', whiteSpace:'nowrap'}}>원</span>
            </div>
          </Field>

          {/* 비고 */}
          <Field label="비고">
            <input className="form-input" value={form.note}
              onChange={e => set('note', e.target.value)}
              placeholder="예) 냉장 보관 / 수입산"/>
          </Field>

          <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:4}}>
            <button type="button" className="btn" onClick={onClose}>취소</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? '저장 중…' : initial ? '수정 저장' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <div style={{fontSize:13, fontWeight:600, color:'var(--text-2)', marginBottom:6}}>
        {label}{required && <span style={{color:'var(--negative)', marginLeft:2}}>*</span>}
        {hint && <span style={{fontSize:11, fontWeight:400, color:'var(--text-3)', marginLeft:6}}>{hint}</span>}
      </div>
      {children}
      {error && <div style={{fontSize:12, color:'var(--negative)', marginTop:4}}>{error}</div>}
    </div>
  );
}

function toForm(r) {
  return {
    ingredientName: r.ingredientName || '',
    productCode:    r.productCode    || '',
    category:       r.category       || '',
    baseQuantity:   r.baseQuantity   != null ? String(r.baseQuantity) : '',
    baseUnitType:   r.baseUnitType   || 'g',
    taxType:        r.taxType        || '과세',
    priceOverride:  r.priceOverride  != null ? String(r.priceOverride) : '',
    note:           r.note           || '',
  };
}
