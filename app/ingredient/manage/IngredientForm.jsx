'use client';
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';

const UNIT_TYPES = ['g', 'kg', 'L', 'ml', '개', '캔', '팩', '봉', '병'];

const EMPTY = {
  ingredientName: '', productCode: '',
  categories: [], manufacturer: '', discontinued: false,
  baseQuantity: '', baseUnitType: 'g', taxType: '과세',
  priceOverride: '', note: '',
};

/**
 * IngredientForm — 식자재 추가/수정 모달
 *
 * 제때 연동 항목(initial.productCode가 가격파일에 있는 항목)은 source 값(온도/판매단위/과세/부가세포함단가)을
 * read-only로 표시. 그 외 필드(재료명·분류·제조사·단종·포장수량·비고)는 수정 가능.
 *
 * @prop {object|null} initial  수정 시 기존 mergedRow, null이면 신규 추가
 * @prop {Function}    onSave   (formData) => Promise<void>
 * @prop {Function}    onClose
 */
export function IngredientForm({ initial, onSave, onClose }) {
  // 제때 연동 = price_rows에 매칭된 항목 (jetteLinked=true)
  const isJetteLinked = !!initial?.jetteLinked;
  const [form, setForm] = useState(initial ? toForm(initial) : EMPTY);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function addTag(t) {
    const tag = (t || '').trim();
    if (!tag) return;
    setForm(f => {
      const cur = f.categories || [];
      if (cur.includes(tag)) return f;
      return { ...f, categories: [...cur, tag] };
    });
    setTagInput('');
  }
  function removeTag(t) {
    setForm(f => ({ ...f, categories: (f.categories || []).filter(x => x !== t) }));
  }

  function validate() {
    const e = {};
    if (!isJetteLinked && !form.ingredientName.trim()) e.ingredientName = '재료명을 입력하세요';
    if (form.baseQuantity && isNaN(Number(form.baseQuantity))) e.baseQuantity = '숫자만 입력하세요';
    if (!isJetteLinked && form.priceOverride && isNaN(Number(form.priceOverride))) e.priceOverride = '숫자만 입력하세요';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const data = {
        ...form,
        baseQuantity:  form.baseQuantity  ? Number(form.baseQuantity)  : null,
        priceOverride: !isJetteLinked && form.priceOverride ? Number(form.priceOverride) : null,
      };
      await onSave(data);
    } finally {
      setSaving(false);
    }
  }

  const isNew = !initial;
  const title = isNew ? '식자재 추가' : isJetteLinked ? '제때 식자재 설정' : '식자재 수정';
  const scopeLabel = initial?.hasRecord ? '전용' : '범용';

  return createPortal(
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.4)',
      display:'grid', placeItems:'center', zIndex:200,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{
        width:'min(540px, 95vw)', maxHeight:'92vh', overflowY:'auto',
        padding:'24px 28px', position:'relative',
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
          <div style={{fontWeight:700, fontSize:16}}>{title}</div>
          <button className="btn" style={{padding:'4px 8px'}} onClick={onClose}>
            <Icon.close style={{width:16, height:16}}/>
          </button>
        </div>

        {/* 제때 연동 — source 정보 (read-only) */}
        {isJetteLinked && (
          <div style={{
            background:'var(--surface-2)', borderRadius:10, padding:'12px 14px',
            marginBottom:16, fontSize:13,
            border:'1px solid var(--border)',
          }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <div style={{fontWeight:700}}>{initial.productName}</div>
              <span className="chip" style={{padding:'2px 8px', fontSize:11,
                background:'var(--accent-soft)', color:'var(--accent-text)'}}>{scopeLabel}</span>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'6px 16px', fontSize:12, color:'var(--text-2)'}}>
              <SourceField label="제품코드" value={initial.productCode}/>
              <SourceField label="온도"     value={initial.temperature}/>
              <SourceField label="판매단위" value={initial.salesUnit}/>
              <SourceField label="과세구분" value={initial.taxType}/>
              <SourceField label="부가세포함단가"
                value={initial.priceWithTax != null ? `${formatNumber(initial.priceWithTax)}원` : null}/>
            </div>
            <div style={{fontSize:11, color:'var(--text-3)', marginTop:8, fontStyle:'italic'}}>
              ※ 위 값들은 제때 가격파일에서 자동 가져옵니다 (수정 불가)
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:14}}>

          {/* 재료명 */}
          <Field label="재료명" required={!isJetteLinked} error={errors.ingredientName}
            hint={isJetteLinked ? '비워두면 제때 제품명 자동 사용' : undefined}>
            <input className="form-input" value={form.ingredientName}
              onChange={e => set('ingredientName', e.target.value)}
              placeholder={isJetteLinked ? initial.displayName : '예) 모짜렐라치즈'}/>
          </Field>

          {/* 분류 태그 (멀티) */}
          <Field label="분류" hint="여러 개 입력 가능 (Enter 또는 쉼표로 추가)">
            <div style={{
              display:'flex', flexWrap:'wrap', gap:4, alignItems:'center',
              padding:'6px 8px',
              background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8,
              minHeight:36,
            }}>
              {(form.categories || []).map(t => (
                <span key={t} className="chip" style={{
                  padding:'3px 6px 3px 10px', fontSize:12, display:'inline-flex', alignItems:'center', gap:4,
                }}>
                  {t}
                  <button type="button" onClick={() => removeTag(t)} style={{
                    border:0, background:'transparent', cursor:'pointer', padding:0,
                    display:'inline-flex', color:'inherit', opacity:.7,
                  }}>
                    <Icon.close style={{width:11, height:11}}/>
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInput);
                  } else if (e.key === 'Backspace' && !tagInput && (form.categories || []).length) {
                    removeTag(form.categories[form.categories.length - 1]);
                  }
                }}
                onBlur={() => addTag(tagInput)}
                placeholder={(form.categories || []).length ? '' : '예) 토핑재료, 육가공류'}
                style={{
                  flex:1, minWidth:120, border:0, outline:0, background:'transparent',
                  fontFamily:'inherit', fontSize:13, color:'var(--text-1)', padding:'2px 4px',
                }}
              />
            </div>
          </Field>

          {/* 제조사 */}
          <Field label="제조사">
            <input className="form-input" value={form.manufacturer}
              onChange={e => set('manufacturer', e.target.value)}
              placeholder="예) CJ제일제당, 매일유업"/>
          </Field>

          {/* 단종 토글 */}
          <Field label="단종 처리" hint="단종 카테고리에만 표시되며, 일반 목록에서 제외됩니다">
            <label style={{display:'inline-flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13}}>
              <input type="checkbox" checked={!!form.discontinued}
                onChange={e => set('discontinued', e.target.checked)}
                style={{accentColor:'var(--accent)', width:16, height:16}}/>
              단종된 제품으로 표시
            </label>
          </Field>

          {/* 신규/수동 항목: 제품코드 */}
          {!isJetteLinked && (
            <Field label="제때 제품코드" hint="입력하면 제때 가격파일과 자동 연동">
              <input className="form-input" value={form.productCode}
                onChange={e => set('productCode', e.target.value)}
                placeholder="예) CC310001 (없으면 비워두세요)"/>
            </Field>
          )}

          {/* 포장수량 (g·개당 단가 계산용) */}
          <Field label="포장수량"
            hint={isJetteLinked
              ? '향후 원가표 연동 시 자동 입력 (현재는 수동)'
              : 'g·개당 단가 자동 계산에 사용'}
            error={errors.baseQuantity}>
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

          {/* 신규/수동: 과세구분 + 수동 단가 */}
          {!isJetteLinked && (
            <>
              <Field label="과세구분">
                <div style={{display:'flex', gap:12}}>
                  {['과세', '면세'].map(t => (
                    <label key={t} style={{display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:14}}>
                      <input type="radio" value={t} checked={form.taxType === t}
                        onChange={() => set('taxType', t)} style={{accentColor:'var(--accent)'}}/>
                      {t}
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="수동 단가 (부가세포함)" hint="제때 연동 없을 때 사용" error={errors.priceOverride}>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <input className="form-input" type="number" value={form.priceOverride}
                    onChange={e => set('priceOverride', e.target.value)}
                    placeholder="예) 7680" style={{flex:1}}/>
                  <span style={{fontSize:13, color:'var(--text-3)', whiteSpace:'nowrap'}}>원</span>
                </div>
              </Field>
            </>
          )}

          {/* 비고 */}
          <Field label="비고">
            <input className="form-input" value={form.note}
              onChange={e => set('note', e.target.value)}
              placeholder="예) 냉장 보관 / 수입산"/>
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

// ── 서브 컴포넌트 ─────────────────────────────────────────────

function SourceField({ label, value }) {
  return (
    <div style={{display:'flex', alignItems:'baseline', gap:8}}>
      <span style={{fontSize:11, color:'var(--text-3)', minWidth:64, fontWeight:500}}>{label}</span>
      <span style={{fontSize:12, color: value ? 'var(--text-1)' : 'var(--text-4)', fontWeight: value ? 600 : 400}}>
        {value || '—'}
      </span>
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
  const categories = Array.isArray(r.categories) && r.categories.length
    ? r.categories
    : (r.category ? [r.category] : []);
  return {
    ingredientName: r.ingredientName || '',
    productCode:    r.productCode    || '',
    categories,
    manufacturer:   r.manufacturer   || '',
    discontinued:   r.discontinued === true,
    baseQuantity:   r.baseQuantity   != null ? String(r.baseQuantity) : '',
    baseUnitType:   r.baseUnitType   || 'g',
    taxType:        r.taxType        || '과세',
    priceOverride:  r.priceOverride  != null ? String(r.priceOverride) : '',
    note:           r.note           || '',
  };
}
