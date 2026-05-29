'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import { EDGE_TYPES, edgeTotalCost, edgeCodeOf } from '@/lib/cost/edge-dough';
import { getAllIngredients } from '@/lib/ingredient';
import { buildUnitPriceMap } from '@/lib/recipe';
import { getPriceFiles, getPriceRowsByFileId } from '@/lib/price';
import { initDB } from '@/lib/db';

const UNIT_OPTIONS = ['g', 'kg', 'ml', 'L', '개', '입', '장', '봉'];
const EMPTY_COMP = () => ({ productCode: null, ingredientName: '', quantity: '', unit: 'g', unitPrice: '' });

export function EdgeEditModal({ initial, onSave, onClose }) {
  const isNew = !initial?.id;
  const [edgeType, setEdgeType]   = useState(initial?.edgeType || EDGE_TYPES[0]);
  const [size,     setSize]       = useState(initial?.size || 'L');
  const [comps,    setComps]      = useState(() => (initial?.components || []).map(c => ({ ...EMPTY_COMP(), ...c })));
  const [note,     setNote]       = useState(initial?.note || '');
  const [allMeta,  setAllMeta]    = useState([]);
  const [upm,      setUpm]        = useState(new Map());
  const [saving,   setSaving]     = useState(false);

  useEffect(() => {
    (async () => {
      await initDB();
      const [files, meta] = await Promise.all([getPriceFiles(), getAllIngredients()]);
      const latest = files[0] || null;
      let priceRowMap = new Map();
      if (latest) {
        const rows = await getPriceRowsByFileId(latest.id);
        rows.forEach(r => { if (r.productCode) priceRowMap.set(r.productCode, r); });
      }
      setAllMeta(meta);
      setUpm(buildUnitPriceMap(meta, priceRowMap));
    })().catch(console.error);
  }, []);

  function patch(i, p) {
    setComps(prev => prev.map((c, idx) => idx === i ? { ...c, ...p } : c));
  }
  function remove(i) { setComps(prev => prev.filter((_, idx) => idx !== i)); }
  function add()     { setComps(prev => [...prev, EMPTY_COMP()]); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id: initial?.id,
        edgeCode: edgeCodeOf(edgeType, size),
        edgeType, size,
        components: comps.map(c => ({
          ...c,
          quantity:  c.quantity  !== '' ? Number(c.quantity)  : null,
          unitPrice: c.unitPrice !== '' ? Number(c.unitPrice) : null,
        })),
        note,
      });
    } finally { setSaving(false); }
  }

  const total = edgeTotalCost({ components: comps });

  return createPortal(
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'grid', placeItems:'center', zIndex:300 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width:'min(780px,96vw)', maxHeight:'92vh', overflowY:'auto', padding:'22px 26px' }}>

        {/* 헤더 */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:16 }}>{isNew ? '엣지·도우 추가' : `${edgeType} ${size} 편집`}</div>
          <button className="btn" style={{ padding:'4px 8px' }} onClick={onClose}>
            <Icon.close style={{ width:16, height:16 }}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* 유형 + 사이즈 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <FL>엣지 유형</FL>
              <select className="form-input" value={edgeType}
                onChange={e => {
                  const t = e.target.value;
                  setEdgeType(t);
                  if (t === '씬도우') setSize('L'); // 씬도우는 L만 유효
                }} disabled={!isNew}>
                {EDGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <FL>규격</FL>
              <div style={{ display:'flex', gap:16, alignItems:'center', padding:'9px 0' }}>
                {(edgeType === '씬도우' ? ['L'] : ['L','R']).map(sz => (
                  <label key={sz} style={{ display:'flex', alignItems:'center', gap:6, cursor: isNew ? 'pointer' : 'default', fontSize:14 }}>
                    <input type="radio" value={sz} checked={size === sz}
                      onChange={() => setSize(sz)} disabled={!isNew}
                      style={{ accentColor:'var(--accent)' }}/>
                    {sz}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 구성품 목록 */}
          <div>
            <FL>구성품</FL>

            {/* 컬럼 헤더 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 72px 110px 90px 28px',
              gap:6, fontSize:11, fontWeight:700, color:'var(--text-3)',
              paddingBottom:6, borderBottom:'1px solid var(--divider)', marginBottom:4 }}>
              <div>재료명</div>
              <div style={{ textAlign:'right' }}>수량</div>
              <div>단위</div>
              <div style={{ textAlign:'right' }}>단가 (원/단위)</div>
              <div style={{ textAlign:'right' }}>소계</div>
              <div/>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {comps.map((c, i) => (
                <CompRow key={i} c={c} allMeta={allMeta} upm={upm}
                  onChange={p => patch(i, p)} onRemove={() => remove(i)}/>
              ))}
              {comps.length === 0 && (
                <div style={{ padding:'20px 0', textAlign:'center', color:'var(--text-3)', fontSize:13 }}>
                  구성품을 추가해주세요
                </div>
              )}
            </div>

            <button type="button" className="btn sm" onClick={add} style={{ marginTop:8 }}>
              <Icon.plus style={{ width:13, height:13 }}/> 구성품 추가
            </button>
          </div>

          {/* 비고 */}
          <div>
            <FL>비고</FL>
            <input className="form-input" value={note} onChange={e => setNote(e.target.value)} placeholder="선택 입력"/>
          </div>

          {/* 총 원가 */}
          <div style={{ padding:'12px 16px', background:'var(--surface-2)', borderRadius:10,
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:600 }}>총 원가</span>
            <span style={{ fontSize:20, fontWeight:800, color:'var(--accent)' }}>
              {formatNumber(total)}<span style={{ fontSize:13, marginLeft:2 }}>원</span>
            </span>
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
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

// ── 구성품 행 ─────────────────────────────────────────────────
function CompRow({ c, allMeta, upm, onChange, onRemove }) {
  const [searchQ,    setSearchQ]    = useState('');
  const [dropOpen,   setDropOpen]   = useState(false);
  const [activeIdx,  setActiveIdx]  = useState(-1);
  const [rect,       setRect]       = useState(null);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const results = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return allMeta.filter(m =>
      (m.ingredientName || '').toLowerCase().includes(q) ||
      (m.productCode    || '').toLowerCase().includes(q)
    ).slice(0, 15);
  }, [searchQ, allMeta]);

  useEffect(() => { setActiveIdx(-1); }, [results]);

  const updateRect = useCallback(() => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setRect({ top: r.bottom + 2, left: r.left, width: r.width });
    }
  }, []);

  useEffect(() => { if (dropOpen) updateRect(); }, [dropOpen, searchQ, updateRect]);
  useEffect(() => {
    if (!dropOpen) return;
    window.addEventListener('scroll', updateRect, true);
    return () => window.removeEventListener('scroll', updateRect, true);
  }, [dropOpen, updateRect]);

  useEffect(() => {
    const h = e => {
      if (inputRef.current && !inputRef.current.closest('[data-comp-row]')?.contains(e.target) &&
          !(listRef.current && listRef.current.contains(e.target))) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    listRef.current.children[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  function selectIng(meta) {
    const info = upm.get(meta.productCode);
    const patch = {
      ingredientName: meta.ingredientName || '',
      productCode:    meta.productCode || null,
      unit:           info?.baseUnitType || meta.baseUnitType || 'g',
    };
    // DB에 단가가 있을 때만 덮어씀 — 없으면 사용자가 직접 입력한 값 유지
    if (info?.unitPrice != null) patch.unitPrice = String(info.unitPrice);
    onChange(patch);
    setSearchQ('');
    setDropOpen(false);
    setActiveIdx(-1);
  }

  function handleNameKey(e) {
    if (!dropOpen || !results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIdx >= 0) selectIng(results[activeIdx]); }
    else if (e.key === 'Escape') { setDropOpen(false); setActiveIdx(-1); }
  }

  const subtotal = (parseFloat(c.quantity) || 0) * (parseFloat(c.unitPrice) || 0);

  const dropdown = dropOpen && results.length > 0 && rect && createPortal(
    <div ref={listRef} style={{
      position:'fixed', top: rect.top, left: rect.left, width: Math.max(rect.width, 260),
      zIndex: 9999, background: 'var(--surface-1)', border: '1px solid var(--border)',
      borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.2)', maxHeight: 220, overflowY: 'auto',
    }}>
      {results.map((m, idx) => {
        const info = upm.get(m.productCode);
        const isActive = idx === activeIdx;
        return (
          <button key={m.productCode || m.ingredientName} type="button"
            onClick={() => selectIng(m)} onMouseEnter={() => setActiveIdx(idx)}
            style={{ display:'block', width:'100%', textAlign:'left', padding:'7px 12px', border:0,
              background: isActive ? 'var(--accent-soft)' : 'transparent', cursor:'pointer',
              borderBottom:'1px solid var(--divider)' }}>
            <div style={{ fontWeight:500, fontSize:13, color: isActive ? 'var(--accent-text)' : undefined }}>
              {m.ingredientName}
            </div>
            <div style={{ fontSize:11, color:'var(--text-3)', display:'flex', gap:8, marginTop:1 }}>
              <span style={{ fontFamily:'monospace' }}>{m.productCode || '수동'}</span>
              {info?.unitPrice != null && (
                <span style={{ color:'var(--positive)' }}>
                  {info.unitPrice < 1 ? info.unitPrice.toFixed(2) : formatNumber(info.unitPrice)}원/{info.baseUnitType}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>,
    document.body
  );

  return (
    <div data-comp-row="1" style={{ display:'grid', gridTemplateColumns:'1fr 90px 72px 110px 90px 28px', gap:6, alignItems:'center' }}>

      {/* 재료명 검색 */}
      <div style={{ position:'relative' }}>
        {c.ingredientName && !searchQ ? (
          <div style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 8px',
            background:'var(--accent-soft)', border:'1.5px solid var(--accent)', borderRadius:7, fontSize:13 }}>
            <span style={{ flex:1, color:'var(--accent-text)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {c.ingredientName}
            </span>
            <button type="button" onClick={() => onChange({ ingredientName:'', productCode:null, unitPrice:'' })}
              style={{ border:0, background:'none', cursor:'pointer', color:'var(--text-3)', padding:0, flexShrink:0 }}>
              <Icon.close style={{ width:12, height:12 }}/>
            </button>
          </div>
        ) : (
          <>
            <input ref={inputRef} className="form-input" style={{ fontSize:13 }}
              value={searchQ}
              onChange={e => {
                const v = e.target.value;
                setSearchQ(v);
                // 검색 도중 부분 텍스트를 재료명으로 저장하지 않음 — 선택 시에만 onChange 호출
                setDropOpen(!!v.trim());
              }}
              onFocus={() => { if (searchQ.trim()) setDropOpen(true); }}
              onKeyDown={handleNameKey}
              placeholder="재료명 검색…"/>
            {dropdown}
          </>
        )}
      </div>

      {/* 수량 */}
      <input className="form-input" type="number" step="any" value={c.quantity ?? ''}
        onChange={e => onChange({ quantity: e.target.value })}
        placeholder="수량" style={{ textAlign:'right' }}/>

      {/* 단위 */}
      <select className="form-input" value={c.unit || 'g'}
        onChange={e => onChange({ unit: e.target.value })}>
        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>

      {/* 단가 */}
      <input className="form-input" type="number" step="any" value={c.unitPrice ?? ''}
        onChange={e => onChange({ unitPrice: e.target.value })}
        placeholder="단가" style={{ textAlign:'right' }}/>

      {/* 소계 */}
      <div style={{ textAlign:'right', fontSize:13, fontWeight:600,
        color: subtotal > 0 ? 'var(--text-1)' : 'var(--text-4)' }}>
        {subtotal > 0 ? `${formatNumber(Math.round(subtotal))}원` : '—'}
      </div>

      {/* 삭제 */}
      <button type="button" onClick={onRemove}
        style={{ background:'transparent', border:'none', padding:4, cursor:'pointer',
          color:'var(--text-4)', display:'inline-flex' }}>
        <Icon.close style={{ width:14, height:14 }}/>
      </button>
    </div>
  );
}

function FL({ children }) {
  return <div style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:6 }}>{children}</div>;
}
