'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { DEFAULT_PLATFORMS, normalizePlatforms } from '@/lib/cost/margin/platforms';

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `u${Date.now()}-${Math.random().toString(36).slice(2)}`;

const blankFee = () => ({ id: uid(), label: '', type: 'fixed', value: '', sizeOverrides: {} });

function clonePlatforms(platforms) {
  const safePlatforms = normalizePlatforms(platforms) || DEFAULT_PLATFORMS;
  return safePlatforms.map(platform => ({
    ...platform,
    fees: (Array.isArray(platform.fees) ? platform.fees : []).map(fee => {
      const next = { ...fee };
      if (fee.sizeOverrides && typeof fee.sizeOverrides === 'object') {
        next.sizeOverrides = { ...fee.sizeOverrides };
      }
      return next;
    }),
  }));
}

export function PlatformSettingsModal({ platforms, onSave, onClose }) {
  const [plats, setPlats] = useState(() => clonePlatforms(platforms));
  const [selId, setSelId] = useState(() => (normalizePlatforms(platforms) || DEFAULT_PLATFORMS)[0]?.id ?? 'default');

  const sel = plats.find(p => p.id === selId) ?? null;

  /* ── platform ── */
  function addPlatform() {
    const p = { id: uid(), name: '새 플랫폼', fees: [] };
    setPlats(prev => [...prev, p]);
    setSelId(p.id);
  }

  function deletePlatform(id) {
    if (id === 'default') return;
    const next = plats.filter(p => p.id !== id);
    setPlats(next);
    if (selId === id) setSelId(next[0]?.id ?? 'default');
  }

  function setPlatName(name) {
    setPlats(prev => prev.map(p => p.id === selId ? { ...p, name } : p));
  }

  /* ── fee ── */
  function addFee() {
    setPlats(prev => prev.map(p =>
      p.id === selId ? { ...p, fees: [...(Array.isArray(p.fees) ? p.fees : []), blankFee()] } : p
    ));
  }

  function deleteFee(feeId) {
    setPlats(prev => prev.map(p =>
      p.id === selId ? { ...p, fees: (Array.isArray(p.fees) ? p.fees : []).filter(f => f.id !== feeId) } : p
    ));
  }

  function patchFee(feeId, patch) {
    setPlats(prev => prev.map(p =>
      p.id === selId
        ? { ...p, fees: (Array.isArray(p.fees) ? p.fees : []).map(f => f.id === feeId ? { ...f, ...patch } : f) }
        : p
    ));
  }

  function patchSizeOverride(feeId, sizeKey, val) {
    setPlats(prev => prev.map(p =>
      p.id === selId
        ? { ...p, fees: (Array.isArray(p.fees) ? p.fees : []).map(f =>
            f.id === feeId
              ? { ...f, sizeOverrides: { ...(f.sizeOverrides || {}), [sizeKey]: val } }
              : f
          )}
        : p
    ));
  }

  /* ── save ── */
  function handleSave() {
    const cleaned = plats.map(p => ({
      ...p,
      name: (p.name || '').trim() || '플랫폼',
      fees: (Array.isArray(p.fees) ? p.fees : [])
        .filter(f => {
          // 항목명이나 금액 중 하나라도 있어야 저장 (둘 다 비어있으면 제외)
          const hasLabel = (f.label ?? '').trim().length > 0;
          const hasValue = parseFloat(f.value) > 0 ||
                           parseFloat(f.sizeOverrides?.L) > 0 ||
                           parseFloat(f.sizeOverrides?.R) > 0;
          return hasLabel || hasValue;
        })
        .map(f => {
          const out = {
            id:    f.id,
            label: (f.label ?? '').trim() || '항목',
            type:  f.type,
            value: parseFloat(f.value) || 0,
          };
          if (f.type === 'fixed') {
            const ov = {};
            const L = parseFloat(f.sizeOverrides?.L);
            const R = parseFloat(f.sizeOverrides?.R);
            if (!isNaN(L) && L > 0) ov.L = L;
            if (!isNaN(R) && R > 0) ov.R = R;
            if (Object.keys(ov).length) out.sizeOverrides = ov;
          }
          return out;
        }),
    }));
    onSave?.(cleaned);
  }

  return createPortal(
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'grid', placeItems:'center', zIndex:300 }}
    >
      <div
        className="card"
        style={{ width:'min(680px,96vw)', height:'min(560px,92vh)', display:'flex', flexDirection:'column', padding:0, overflow:'hidden' }}
      >
        {/* ── Header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid var(--divider)', flexShrink:0 }}>
          <span style={{ fontWeight:700, fontSize:15 }}>플랫폼 수수료 설정</span>
          <button type="button" className="btn" style={{ padding:'4px 8px' }} onClick={onClose}>
            <Icon.close style={{ width:15, height:15 }}/>
          </button>
        </div>

        {/* ── Body: 좌우 패널 ── */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* 좌: 플랫폼 목록 */}
          <div style={{ width:160, borderRight:'1px solid var(--divider)', display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto' }}>
            {plats.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelId(p.id)}
                style={{
                  textAlign:'left', padding:'10px 16px', fontSize:13, border:'none', cursor:'pointer',
                  background: p.id === selId ? 'var(--accent)' : 'transparent',
                  color: p.id === selId ? '#fff' : 'var(--text-1)',
                  fontWeight: p.id === selId ? 600 : 400,
                }}
              >
                {p.name}
                {p.fees?.length > 0 && (
                  <span style={{ fontSize:11, marginLeft:5, opacity:.7 }}>({p.fees.length})</span>
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={addPlatform}
              style={{
                textAlign:'left', padding:'10px 16px', fontSize:12, border:'none', cursor:'pointer',
                background:'transparent', color:'var(--accent)', display:'flex', alignItems:'center', gap:4, marginTop:2,
              }}
            >
              <Icon.plus style={{ width:12, height:12 }}/> 플랫폼 추가
            </button>
          </div>

          {/* 우: 선택된 플랫폼 에디터 */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 }}>
            {!sel ? null : sel.id === 'default' ? (
              <div style={{ paddingTop:40, textAlign:'center', color:'var(--text-3)', fontSize:13 }}>
                기본은 수수료 없이 판매가 그대로 마진을 계산합니다.
              </div>
            ) : (
              <>
                {/* 플랫폼명 */}
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', marginBottom:6, letterSpacing:'0.04em', textTransform:'uppercase' }}>플랫폼명</div>
                  <input
                    className="form-input"
                    value={sel.name}
                    onChange={e => setPlatName(e.target.value)}
                    placeholder="예) 쿠팡이츠"
                    style={{ maxWidth:220 }}
                  />
                </div>

                {/* 수수료 항목 */}
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', marginBottom:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>수수료 항목</div>

                  {sel.fees.length === 0 && (
                    <div style={{ fontSize:12, color:'var(--text-4)', marginBottom:10 }}>항목을 추가하세요.</div>
                  )}

                  <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                    {sel.fees.map((f, i) => (
                      <FeeRow
                        key={f.id}
                        f={f}
                        isLast={i === sel.fees.length - 1}
                        onPatch={patch => patchFee(f.id, patch)}
                        onSizeOverride={(k, v) => patchSizeOverride(f.id, k, v)}
                        onDelete={() => deleteFee(f.id)}
                      />
                    ))}
                  </div>

                  <button type="button" className="btn sm" onClick={addFee} style={{ fontSize:11, marginTop:10 }}>
                    <Icon.plus style={{ width:11, height:11 }}/> 항목 추가
                  </button>
                </div>

                {/* 삭제 */}
                <div style={{ marginTop:'auto', paddingTop:16, borderTop:'1px solid var(--divider)' }}>
                  <button type="button" className="btn sm" onClick={() => deletePlatform(sel.id)}
                    style={{ fontSize:11, color:'var(--negative)' }}>
                    <Icon.trash style={{ width:11, height:11 }}/> 이 플랫폼 삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'12px 20px', borderTop:'1px solid var(--divider)', flexShrink:0 }}>
          <button type="button" className="btn" onClick={onClose}>취소</button>
          <button type="button" className="btn primary" onClick={handleSave}>저장</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── 수수료 행 컴포넌트 ── */
function FeeRow({ f, onPatch, onSizeOverride, onDelete }) {
  const isFixed = f.type === 'fixed';

  return (
    <div style={{ borderRadius:6, border:'1px solid var(--border)', overflow:'hidden', marginBottom:4 }}>
      {/* 메인 행 */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 10px', background:'var(--surface-1,var(--surface))' }}>
        {/* 항목명 */}
        <input
          className="form-input"
          value={f.label}
          onChange={e => onPatch({ label: e.target.value })}
          placeholder="항목명"
          style={{ flex:1, minWidth:0, fontSize:13 }}
        />

        {/* 타입 세그먼트 */}
        <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:5, overflow:'hidden', flexShrink:0 }}>
          {[['pct','%'],['fixed','원']].map(([t, lbl]) => (
            <button key={t} type="button"
              onClick={() => onPatch({ type: t })}
              style={{
                padding:'5px 10px', fontSize:12, fontWeight:600, border:'none', cursor:'pointer',
                background: f.type === t ? 'var(--accent)' : 'transparent',
                color:      f.type === t ? '#fff' : 'var(--text-3)',
              }}>{lbl}</button>
          ))}
        </div>

        {/* % 타입: 인라인 값 */}
        {!isFixed && (
          <div style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
            <input
              className="form-input"
              type="number" min="0" max="100" step="0.1"
              value={f.value}
              onChange={e => onPatch({ value: e.target.value })}
              placeholder="0"
              style={{ width:64, textAlign:'right', fontSize:13 }}
            />
            <span style={{ fontSize:12, color:'var(--text-3)' }}>%</span>
          </div>
        )}

        {/* 삭제 */}
        <button type="button" className="btn sm" onClick={onDelete} style={{ color:'var(--text-4)', flexShrink:0 }}>
          <Icon.trash style={{ width:12, height:12 }}/>
        </button>
      </div>

      {/* 원 타입: 사이즈별 금액 */}
      {isFixed && (
        <div style={{ display:'flex', gap:12, padding:'8px 10px 10px', background:'var(--surface-2)', alignItems:'center', flexWrap:'wrap' }}>
          {[
            { key:'value', label:'공통', hint:'기본값', isBase:true },
            { key:'L',     label:'L',   hint:'비우면 공통' },
            { key:'R',     label:'R',   hint:'비우면 공통' },
          ].map(({ key, label, isBase }) => (
            <div key={key} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:12, fontWeight:700, color: isBase ? 'var(--text-2)' : 'var(--text-3)', minWidth:20 }}>{label}</span>
              <input
                className="form-input"
                type="number" min="0"
                value={isBase ? f.value : (f.sizeOverrides?.[key] ?? '')}
                onChange={e => isBase ? onPatch({ value: e.target.value }) : onSizeOverride(key, e.target.value)}
                placeholder={isBase ? '0' : '공통'}
                style={{ width:76, textAlign:'right', fontSize:13 }}
              />
              <span style={{ fontSize:11, color:'var(--text-4)' }}>원</span>
            </div>
          ))}
          <span style={{ fontSize:11, color:'var(--text-4)', marginLeft:4 }}>L·R 비우면 공통 적용</span>
        </div>
      )}
    </div>
  );
}
