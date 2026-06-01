'use client';
import { useState, useId, useRef } from 'react';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { SEED_MAIN_CATEGORIES, SEED_HASH_TAGS, sortMainCategories } from '@/lib/ingredient';
import { SCOPE } from '@/lib/ingredient/constants';

const UNIT_TYPES = ['g', 'kg', 'L', 'ml', '개', '캔', '팩', '봉', '병'];
const LS_UNIT_TYPE = 'v3:ingredient_lastUnitType';

function getLastUnitType() {
  try { return localStorage.getItem(LS_UNIT_TYPE) || 'g'; } catch { return 'g'; }
}

const EMPTY = {
  ingredientName: '', productCode: '',
  category: '', tags: [],
  manufacturer: '', discontinued: false,
  baseQuantity: '', baseUnitType: getLastUnitType(), taxType: '과세',
  priceOverride: '', note: '',
};

export function IngredientForm({ initial, onSave, onClose, extraCategories = [] }) {
  const isJetteLinked = !!initial?.jetteLinked;
  // 시드 분류 + 실제 사용 중인 분류(직접입력 포함) 합본 → 직접입력 분류도 다음부터 드롭다운에 노출
  const catOptions = sortMainCategories([...new Set([...SEED_MAIN_CATEGORIES, ...extraCategories].filter(Boolean))]);
  const [form, setForm] = useState(initial ? toForm(initial) : EMPTY);
  const [tagInput, setTagInput] = useState('');
  const [customCat, setCustomCat] = useState(
    !!initial?.category && !catOptions.includes(initial.category)
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const datalistId = useId();
  const initialFormRef = useRef(JSON.stringify(initial ? toForm(initial) : EMPTY));
  const isDirty = JSON.stringify(form) !== initialFormRef.current;
  useBeforeUnload(isDirty);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function addTag(t) {
    const tag = (t || '').trim();
    if (!tag) return;
    setForm(f => {
      const cur = f.tags || [];
      if (cur.includes(tag)) return f;
      return { ...f, tags: [...cur, tag] };
    });
    setTagInput('');
  }
  function removeTag(t) {
    setForm(f => ({ ...f, tags: (f.tags || []).filter(x => x !== t) }));
  }

  function validate() {
    const e = {};
    if (!isJetteLinked && !form.ingredientName.trim()) e.ingredientName = '재료명을 입력하세요';
    if (form.baseQuantity && isNaN(Number(form.baseQuantity))) e.baseQuantity = '숫자만 입력하세요';
    if (!isJetteLinked && form.priceOverride && isNaN(Number(form.priceOverride))) e.priceOverride = '숫자만 입력하세요';
    return e;
  }

  useKeyboardSave(() => handleSubmit({ preventDefault() {} }));

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
      try { localStorage.setItem(LS_UNIT_TYPE, data.baseUnitType || 'g'); } catch {}
    } finally {
      setSaving(false);
    }
  }

  const isNew = !initial;
  const title = isNew ? '식자재 추가' : isJetteLinked ? '제때 식자재 설정' : '식자재 수정';
  const scopeLabel = initial?.scope || (initial?.hasRecord ? SCOPE.EXCLUSIVE : SCOPE.GENERIC);

  return createPortal(
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.4)',
      display:'grid', placeItems:'center', zIndex:200,
    }}>
      <div className="card" style={{
        width:'min(560px, 95vw)', maxHeight:'92vh', overflowY:'auto',
        padding:'24px 28px', position:'relative',
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
          <div style={{fontWeight:700, fontSize:16}}>{title}</div>
          <button type="button" className="btn" style={{padding:'4px 8px'}} onClick={onClose}>
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

        <form onSubmit={handleSubmit} aria-busy={saving} style={{display:'flex', flexDirection:'column', gap:14}}>

          <Field label="재료명" required={!isJetteLinked} error={errors.ingredientName}
            errorId="ingredientName-error"
            hint={isJetteLinked ? '비워두면 제때 제품명 자동 사용' : undefined}>
            <input className="form-input" value={form.ingredientName}
              aria-describedby={errors.ingredientName ? 'ingredientName-error' : undefined}
              onChange={e => set('ingredientName', e.target.value)}
              placeholder={isJetteLinked ? initial.displayName : '예) 모짜렐라치즈'}/>
          </Field>

          {/* 분류 (메인 1개) */}
          <Field label="분류" hint="메인 카테고리 1개 (예: 토핑재료, 엣지, 사이드)">
            <div style={{display:'flex', gap:6, alignItems:'center'}}>
              {customCat ? (
                <input className="form-input" value={form.category}
                  onChange={e => set('category', e.target.value)}
                  placeholder="직접 입력" style={{flex:1}}/>
              ) : (
                <select className="form-input" value={form.category}
                  onChange={e => set('category', e.target.value)} style={{flex:1}}>
                  <option value="">미분류</option>
                  {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <button type="button" className="btn" style={{whiteSpace:'nowrap', flexShrink:0}}
                onClick={() => { setCustomCat(v => !v); set('category', ''); }}>
                {customCat ? '목록에서 선택' : '직접 입력'}
              </button>
            </div>
          </Field>

          {/* 해시태그 (멀티) */}
          <Field label="#태그" hint="여러 개 입력 가능 (예: 육가공류, 수산류, 치즈류)">
            <div style={{
              display:'flex', flexWrap:'wrap', gap:4, alignItems:'center',
              padding:'6px 8px',
              background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8,
              minHeight:36,
            }}>
              {(form.tags || []).map(t => (
                <span key={t} style={{
                  padding:'3px 6px 3px 10px', fontSize:12, fontWeight:500,
                  background:'var(--surface-2)', color:'var(--text-2)', borderRadius:6,
                  display:'inline-flex', alignItems:'center', gap:4,
                }}>
                  #{t}
                  <button type="button" onClick={() => removeTag(t)} style={{
                    border:0, background:'transparent', cursor:'pointer', padding:0,
                    display:'inline-flex', color:'inherit', opacity:.6,
                  }}>
                    <Icon.close style={{width:11, height:11}}/>
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                list={datalistId}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInput);
                  } else if (e.key === 'Backspace' && !tagInput && (form.tags || []).length) {
                    removeTag(form.tags[form.tags.length - 1]);
                  }
                }}
                onBlur={() => addTag(tagInput)}
                placeholder={(form.tags || []).length ? '' : '예) 육가공류, 수산류'}
                style={{
                  flex:1, minWidth:120, border:0, outline:0, background:'transparent',
                  fontFamily:'inherit', fontSize:13, color:'var(--text-1)', padding:'2px 4px',
                }}
              />
              <datalist id={datalistId}>
                {SEED_HASH_TAGS.map(t => <option key={t} value={t}/>)}
              </datalist>
            </div>
          </Field>

          <Field label="제조사">
            <input className="form-input" value={form.manufacturer}
              onChange={e => set('manufacturer', e.target.value)}
              placeholder="예) CJ제일제당, 매일유업"/>
          </Field>

          <Field label="단종 처리" hint="단종 카테고리에만 표시되며, 일반 목록에서 제외됩니다">
            <label style={{display:'inline-flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13}}>
              <input type="checkbox" checked={!!form.discontinued}
                onChange={e => set('discontinued', e.target.checked)}
                style={{accentColor:'var(--accent)', width:16, height:16}}/>
              단종된 제품으로 표시
            </label>
          </Field>

          {!isJetteLinked && (
            <Field label="제때 제품코드" hint="입력하면 제때 가격파일과 자동 연동">
              <input className="form-input" value={form.productCode}
                onChange={e => set('productCode', e.target.value)}
                placeholder="예) CC310001 (없으면 비워두세요)"/>
            </Field>
          )}

          <Field label="포장수량"
            hint={isJetteLinked
              ? '향후 원가표 연동 시 자동 입력 (현재는 수동)'
              : 'g·개당 단가 자동 계산에 사용'}
            error={errors.baseQuantity}
            errorId="baseQuantity-error">
            <div style={{display:'flex', gap:8}}>
              <input className="form-input" type="number" min="0" value={form.baseQuantity}
                aria-describedby={errors.baseQuantity ? 'baseQuantity-error' : undefined}
                onChange={e => set('baseQuantity', e.target.value)}
                placeholder="예) 1000" style={{flex:1}}/>
              <select className="form-input" value={form.baseUnitType}
                onChange={e => set('baseUnitType', e.target.value)} style={{width:80}}>
                {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </Field>

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

              <Field label="수동 단가 (부가세포함)" hint="제때 연동 없을 때 사용" error={errors.priceOverride}
                errorId="priceOverride-error">
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <input className="form-input" type="number" min="0" value={form.priceOverride}
                    aria-describedby={errors.priceOverride ? 'priceOverride-error' : undefined}
                    onChange={e => set('priceOverride', e.target.value)}
                    placeholder="예) 7680" style={{flex:1}}/>
                  <span style={{fontSize:13, color:'var(--text-3)', whiteSpace:'nowrap'}}>원</span>
                </div>
              </Field>
            </>
          )}

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

function Field({ label, required, hint, error, errorId, children }) {
  return (
    <div>
      <div style={{fontSize:13, fontWeight:600, color:'var(--text-2)', marginBottom:6}}>
        {label}{required && <span style={{color:'var(--negative)', marginLeft:2}}>*</span>}
        {hint && <span style={{fontSize:11, fontWeight:400, color:'var(--text-3)', marginLeft:6}}>{hint}</span>}
      </div>
      {children}
      {error && <div id={errorId} role="alert" style={{fontSize:12, color:'var(--negative)', marginTop:4}}>{error}</div>}
    </div>
  );
}

function toForm(r) {
  const category = r.category || (Array.isArray(r.categories) && r.categories[0]) || '';
  const tags = (Array.isArray(r.tags) && r.tags.length)
    ? r.tags
    : (Array.isArray(r.categories) ? r.categories.slice(1) : []);
  return {
    ingredientName: r.ingredientName || '',
    productCode:    r.productCode    || '',
    category,
    tags,
    manufacturer:   r.manufacturer   || '',
    discontinued:   r.discontinued === true,
    baseQuantity:   r.baseQuantity   != null ? String(r.baseQuantity) : '',
    baseUnitType:   r.baseUnitType   || 'g',
    taxType:        r.taxType        || '과세',
    priceOverride:  r.priceOverride  != null ? String(r.priceOverride) : '',
    note:           r.note           || '',
  };
}
