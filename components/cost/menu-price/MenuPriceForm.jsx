'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { MENU_PRICE_CATEGORIES, defaultSizesFor } from '@/lib/cost/menu-price';

const EMPTY = { category: '피자', menuName: '', size: 'L', price: '', note: '' };

export function MenuPriceForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ? toForm(initial) : EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  function set(key, val) {
    setForm(f => {
      const next = { ...f, [key]: val };
      // 분류 바뀌면 규격 자동 조정
      if (key === 'category') {
        const sizes = defaultSizesFor(val);
        if (!sizes.includes(next.size)) next.size = sizes[0];
      }
      return next;
    });
  }

  function validate() {
    const e = {};
    if (!form.menuName.trim()) e.menuName = '메뉴명을 입력하세요';
    if (form.price === '' || isNaN(Number(form.price))) e.price = '판매가는 숫자로 입력';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave({ ...form, price: Number(form.price) });
    } finally {
      setSaving(false);
    }
  }

  const isNew = !initial;
  const title = isNew ? '메뉴 판매가 추가' : '메뉴 판매가 수정';
  const sizes = defaultSizesFor(form.category);

  return createPortal(
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.4)',
      display:'grid', placeItems:'center', zIndex:200,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{
        width:'min(480px, 95vw)', maxHeight:'92vh', overflowY:'auto',
        padding:'24px 28px',
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
          <div style={{fontWeight:700, fontSize:16}}>{title}</div>
          <button className="btn" style={{padding:'4px 8px'}} onClick={onClose}>
            <Icon.close style={{width:16, height:16}}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:14}}>
          <Field label="분류" required>
            <select className="form-input" value={form.category}
              onChange={e => set('category', e.target.value)}>
              {MENU_PRICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="메뉴명" required error={errors.menuName}>
            <input className="form-input" value={form.menuName}
              onChange={e => set('menuName', e.target.value)}
              placeholder="예) 슈퍼콤비네이션"/>
          </Field>

          <Field label="규격">
            <div style={{display:'flex', gap:12}}>
              {sizes.map(s => (
                <label key={s} style={{display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:14}}>
                  <input type="radio" value={s} checked={form.size === s}
                    onChange={() => set('size', s)} style={{accentColor:'var(--accent)'}}/>
                  {s}
                </label>
              ))}
            </div>
          </Field>

          <Field label="판매가 (부가세 포함)" required error={errors.price}>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <input className="form-input" type="number" value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="예) 32000" style={{flex:1}}/>
              <span style={{fontSize:13, color:'var(--text-3)'}}>원</span>
            </div>
          </Field>

          <Field label="비고">
            <input className="form-input" value={form.note}
              onChange={e => set('note', e.target.value)}
              placeholder="선택 입력"/>
          </Field>

          <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:4}}>
            <button type="button" className="btn" onClick={onClose}>취소</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? '저장 중…' : isNew ? '추가' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <div style={{fontSize:13, fontWeight:600, color:'var(--text-2)', marginBottom:6}}>
        {label}{required && <span style={{color:'var(--negative)', marginLeft:2}}>*</span>}
      </div>
      {children}
      {error && <div style={{fontSize:12, color:'var(--negative)', marginTop:4}}>{error}</div>}
    </div>
  );
}

function toForm(r) {
  return {
    category: r.category || '피자',
    menuName: r.menuName || '',
    size:     r.size     || (r.category === '피자' ? 'L' : '단일'),
    price:    r.price != null ? String(r.price) : '',
    note:     r.note     || '',
  };
}
