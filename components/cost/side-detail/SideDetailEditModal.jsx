'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { sideTotalCost } from '@/lib/cost/side-detail';
import { getAllIngredients, buildMetaOnlyRow } from '@/lib/ingredient';
import { ComponentRow } from '@/components/cost/shared/ComponentRow';

const EMPTY_COMPONENT = { productCode: null, ingredientName: '', quantity: '', unit: 'g', unitPrice: '' };

export function SideDetailEditModal({ menu, initial, onSave, onClose }) {
  const [components, setComponents] = useState(initial?.components || []);
  const [note, setNote]             = useState(initial?.note || '');
  const [ingredients, setIngredients] = useState([]);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const all = await getAllIngredients();
        setIngredients(all.filter(m => m.isSeeded || m.isManual).map(buildMetaOnlyRow));
      } catch (err) { console.warn(err); }
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
        id: initial?.id,
        menuCode: menu.menuCode,
        menuName: menu.menuName,
        components,
        note,
      });
    } finally { setSaving(false); }
  }

  const totalCost = sideTotalCost({ components });
  const costRate = (menu.price && totalCost > 0) ? (totalCost / menu.price * 100) : null;
  const listId = 'side-detail-ing-options';

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
          <div>
            <div style={{fontWeight:700, fontSize:16}}>{menu.menuName}</div>
            <div style={{fontSize:11, color:'var(--text-3)', marginTop:2, fontFamily:"'JetBrains Mono', ui-monospace, monospace"}}>
              {menu.menuCode}
              {menu.price != null && <span style={{marginLeft:8}}>· 판매가 {formatNumber(menu.price)}원</span>}
            </div>
          </div>
          <button className="btn" style={{padding:'4px 8px'}} onClick={onClose}>
            <Icon.close style={{width:16, height:16}}/>
          </button>
        </div>

        <div style={{
          padding:'8px 12px', marginBottom:16, fontSize:12, color:'var(--text-2)',
          background:'var(--accent-soft)', borderRadius:8, border:'1px solid var(--border)',
        }}>
          식재료뿐 아니라 용기·박스·스티커 등 포장재 원가도 포함하세요.
        </div>

        <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:14}}>
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

          <div>
            <div style={{fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:6}}>비고</div>
            <input className="form-input" value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="선택 입력"/>
          </div>

          <div style={{
            padding:'12px 14px', background:'var(--surface-2)', borderRadius:10,
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <div>
              <div style={{fontSize:13, fontWeight:600}}>총 원가</div>
              {costRate != null && (
                <div style={{fontSize:11, color: costRate >= 35 ? 'var(--negative)' : 'var(--text-3)', marginTop:2}}>
                  원가율 {costRate.toFixed(1)}%
                </div>
              )}
            </div>
            <span style={{fontSize:20, fontWeight:800, color:'var(--accent)'}}>
              {formatNumber(totalCost)}<span style={{fontSize:13, marginLeft:2}}>원</span>
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
