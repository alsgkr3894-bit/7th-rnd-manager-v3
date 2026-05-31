'use client';
import { useState } from 'react';
import { MENU_PRICE_CATEGORIES, defaultSizesFor, getDefaultPrice } from '@/lib/cost/menu-price';
import { parseCategoryFromCode } from '@/lib/cost/menu-price/code';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { showToast } from '@/components/Toast';

const EMPTY = { menuCode: '', category: '피자', menuName: '', size: 'L', price: '', note: '' };

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

      // 메뉴코드 입력 시 분류·규격·판매가 자동 채우기
      if (key === 'menuCode' && val) {
        const code = val.toUpperCase();
        const parts = code.split('-');
        const { category } = parseCategoryFromCode(code);

        // 분류 자동 세팅
        if (category && MENU_PRICE_CATEGORIES.includes(category)) {
          next.category = category;
          const sizes = defaultSizesFor(category);
          if (!sizes.includes(next.size)) next.size = sizes[0];
        }

        // 사이즈 자동 세팅 (코드 마지막 부분에서 L/R/ONE 추출)
        const lastPart = parts[parts.length - 1];
        if (['L', 'R', 'ONE'].includes(lastPart)) next.size = lastPart;

        // 기본 판매가 자동 채우기 (비어있을 때만)
        if (!f.price) {
          const defaultPrice = getDefaultPrice(code);
          if (defaultPrice) next.price = String(defaultPrice);
        }
      }

      return next;
    });
  }

  function validate() {
    const e = {};
    if (!form.menuName.trim()) e.menuName = '메뉴명을 입력하세요';
    const price = Number(form.price);
    if (form.price === '' || isNaN(price)) e.price = '판매가는 숫자로 입력';
    else if (price < 0)            e.price = '판매가는 0 이상이어야 합니다';
    else if (price > 10_000_000)   e.price = '판매가가 너무 큽니다 (1천만원 이하)';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const savePromise = onSave({ ...form, price: Number(form.price) });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('저장 시간 초과')), 10000));
      await Promise.race([savePromise, timeoutPromise]);
    } catch (err) {
      if (err?.message === '저장 시간 초과') {
        showToast('저장 시간 초과 — 다시 시도해주세요', 'error', 4000);
      } else {
        throw err;
      }
    } finally {
      setSaving(false);
    }
  }

  const isNew = !initial;
  const title = isNew ? '메뉴 판매가 추가' : '메뉴 판매가 수정';
  const sizes = defaultSizesFor(form.category);

  return (
    <ModalFrame
      title={title}
      onClose={onClose}
      width="min(480px, 95vw)"
      padding="24px 28px"
    >
        <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:14}}>
          <Field label="메뉴코드" hint={isNew ? '비워두면 저장 시 자동 발급 (PZ/IP/SD/ST/TS 형식)' : '코드를 직접 수정할 수 있어요'}>
            <input
              className="form-input mono"
              value={form.menuCode}
              onChange={e => set('menuCode', e.target.value.toUpperCase())}
              placeholder="예) PZ-001-L  (비우면 자동 발급)"
            />
          </Field>

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

          <Field label="판매가 (부가세 포함)" required error={errors.price}
            hint={form.menuCode ? (() => { const p = getDefaultPrice(form.menuCode.toUpperCase()); return p ? `기본가 ${p.toLocaleString()}원` : null; })() : null}>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <input className="form-input" type="number" min="0" value={form.price}
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
    </ModalFrame>
  );
}

function Field({ label, required, hint, error, children }) {
  // role="group" + aria-label 로 라벨과 컨트롤을 연결.
  // (children 에 라디오 등 자체 <label>이 포함될 수 있어 <label> 래핑은 중첩 label 위험 → group 사용)
  return (
    <div role="group" aria-label={required ? `${label} (필수)` : label}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6}}>
        <span style={{fontSize:13, fontWeight:600, color:'var(--text-2)'}}>
          {label}{required && <span style={{color:'var(--negative)', marginLeft:2}}>*</span>}
        </span>
        {hint && <span style={{fontSize:11, color:'var(--text-4)'}}>{hint}</span>}
      </div>
      {children}
      {error && <div style={{fontSize:12, color:'var(--negative)', marginTop:4}}>{error}</div>}
    </div>
  );
}

function toForm(r) {
  return {
    menuCode: r.menuCode || '',
    category: r.category || '피자',
    menuName: r.menuName || '',
    size:     r.size     || (r.category === '피자' ? 'L' : '단일'),
    price:    r.price != null ? String(r.price) : '',
    note:     r.note     || '',
  };
}
