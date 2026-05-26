'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { EDGE_TYPES, edgeTotalCost, edgeCodeOf } from '@/lib/cost/edge-dough';
import { getAllIngredients, buildMetaOnlyRow } from '@/lib/ingredient';
import { ComponentRow } from './ComponentRow';

const EMPTY_COMPONENT = { productCode: null, ingredientName: '', quantity: '', unit: 'g', unitPrice: '' };

export function EdgeEditModal({ initial, onSave, onClose }) {
  const isNew = !initial?.id;
  const [edgeType, setEdgeType] = useState(initial?.edgeType || EDGE_TYPES[0]);
  const [size, setSize]         = useState(initial?.size || 'L');
  const [components, setComponents] = useState(initial?.components || []);
  const [note, setNote]         = useState(initial?.note || '');
  const [ingredients, setIngredients] = useState([]);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await getAllIngredients();
        // 단가 계산 가능한 항목만 자동완성에 노출
        setIngredients(all.filter(m => m.isSeeded || m.isManual).map(buildMetaOnlyRow));
      } catch (err) {
        console.warn('식자재 자동완성 로드 실패', err);
      }
    })();
  }, []);

  function patchComponent(i, patch) {
    setComponents(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }
  function removeComponent(i) {
    setComponents(prev => prev.filter((_, idx) => idx !== i));
  }
  function addComponent() {
    setComponents(prev => [...prev, { ...EMPTY_COMPONENT }]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id:        initial?.id,
        edgeCode:  edgeCodeOf(edgeType, size),
        edgeType,
        size,
        components,
        note,
      });
    } finally { setSaving(false); }
  }

  const total = edgeTotalCost({ components });
  const title = isNew ? '엣지·도우 추가' : `${edgeType} ${size} 편집`;
  const listId = 'edge-dough-ing-options';

  return createPortal(
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.45)',
      display:'grid', placeItems:'center', zIndex:200,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{
        width:'min(860px, 96vw)', maxHeight:'92vh', overflowY:'auto',
        padding:'22px 26px',
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
          <div style={{fontWeight:700, fontSize:16}}>{title}</div>
          <button className="btn" style={{padding:'4px 8px'}} onClick={onClose}>
            <Icon.close style={{width:16, height:16}}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:14}}>

          {/* 엣지 유형 + 사이즈 (신규일 때만 편집 가능) */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <Field label="엣지 유형">
              <select className="form-input" value={edgeType}
                onChange={e => setEdgeType(e.target.value)} disabled={!isNew}>
                {EDGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="규격">
              <div style={{display:'flex', gap:12, alignItems:'center', padding:'8px 0'}}>
                {(edgeType === '씬도우' ? ['L'] : ['L', 'R']).map(sz => (
                  <label key={sz} style={{display:'flex', alignItems:'center', gap:6, cursor: isNew ? 'pointer' : 'default', fontSize:14}}>
                    <input type="radio" value={sz} checked={size === sz}
                      onChange={() => setSize(sz)} disabled={!isNew}
                      style={{accentColor:'var(--accent)'}}/>
                    {sz}
                  </label>
                ))}
              </div>
            </Field>
          </div>

          {/* 구성품 헤더 */}
          <div style={{
            display:'grid',
            gridTemplateColumns: '1fr 80px 64px 100px 100px 28px',
            gap:6, fontSize:11, fontWeight:700, color:'var(--text-3)',
            paddingBottom:4, borderBottom:'1px solid var(--divider)',
          }}>
            <div>재료명</div>
            <div style={{textAlign:'right'}}>수량</div>
            <div>단위</div>
            <div style={{textAlign:'right'}}>단가(/단위)</div>
            <div style={{textAlign:'right'}}>소계</div>
            <div/>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            {components.map((c, i) => (
              <ComponentRow key={i} c={c} listId={listId} ingredients={ingredients}
                onChange={patch => patchComponent(i, patch)}
                onRemove={() => removeComponent(i)}/>
            ))}
            {components.length === 0 && (
              <div style={{padding:'14px 0', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
                구성품을 추가해주세요
              </div>
            )}
          </div>

          <datalist id={listId}>
            {ingredients.map(ing => (
              <option key={ing.productCode || ing.ingredientName} value={ing.ingredientName || ing.productName}/>
            ))}
          </datalist>

          <button type="button" className="btn sm" onClick={addComponent}
            style={{alignSelf:'flex-start'}}>
            <Icon.plus style={{width:13, height:13}}/> 구성품 추가
          </button>

          <Field label="비고">
            <input className="form-input" value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="선택 입력"/>
          </Field>

          {/* 총 원가 */}
          <div style={{
            padding:'12px 14px', background:'var(--surface-2)', borderRadius:10,
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <span style={{fontSize:13, fontWeight:600}}>총 원가</span>
            <span style={{fontSize:20, fontWeight:800, color:'var(--accent)'}}>
              {formatNumber(total)}<span style={{fontSize:13, marginLeft:2}}>원</span>
            </span>
          </div>

          <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
            <button type="button" className="btn" onClick={onClose}>취소</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:6}}>{label}</div>
      {children}
    </div>
  );
}
