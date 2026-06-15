'use client';
import { useReducer } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { DEFAULT_PLATFORMS, normalizePlatforms } from '@/lib/cost/margin/platforms';
import { FeeRow } from './FeeRow';

let uidSeq = 0;

function makeId(prefix, existingIds = []) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;

  const used = new Set(existingIds.map(String));
  let id = '';
  do {
    uidSeq += 1;
    id = `${prefix}-${uidSeq.toString(36)}`;
  } while (used.has(id));
  return id;
}

function collectIds(platforms) {
  const ids = [];
  for (const platform of platforms || []) {
    if (platform?.id) ids.push(platform.id);
    for (const fee of Array.isArray(platform?.fees) ? platform.fees : []) {
      if (fee?.id) ids.push(fee.id);
    }
  }
  return ids;
}

const blankFee = existingIds => ({
  id: makeId('fee', existingIds),
  label: '',
  type: 'fixed',
  value: '',
  sizeOverrides: {},
});

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

function initState(platforms) {
  const plats = clonePlatforms(platforms);
  return { plats, selId: plats[0]?.id ?? 'default' };
}

function reducer(state, action) {
  const { plats, selId } = state;
  switch (action.type) {
    case 'SET_SEL':
      return { ...state, selId: action.id };
    case 'ADD_PLATFORM': {
      const p = { id: makeId('platform', collectIds(plats)), name: '새 플랫폼', fees: [] };
      return { ...state, plats: [...plats, p], selId: p.id };
    }
    case 'DELETE_PLATFORM': {
      if (action.id === 'default') return state;
      const next = plats.filter(p => p.id !== action.id);
      return { plats: next, selId: selId === action.id ? (next[0]?.id ?? 'default') : selId };
    }
    case 'SET_PLAT_NAME':
      return {
        ...state,
        plats: plats.map(p => (p.id === selId ? { ...p, name: action.name } : p)),
      };
    case 'ADD_FEE':
      return {
        ...state,
        plats: plats.map(p =>
          p.id === selId
            ? {
                ...p,
                fees: [...(Array.isArray(p.fees) ? p.fees : []), blankFee(collectIds(plats))],
              }
            : p
        ),
      };
    case 'DELETE_FEE':
      return {
        ...state,
        plats: plats.map(p =>
          p.id === selId
            ? { ...p, fees: (Array.isArray(p.fees) ? p.fees : []).filter(f => f.id !== action.id) }
            : p
        ),
      };
    case 'PATCH_FEE':
      return {
        ...state,
        plats: plats.map(p =>
          p.id === selId
            ? {
                ...p,
                fees: (Array.isArray(p.fees) ? p.fees : []).map(f =>
                  f.id === action.id ? { ...f, ...action.patch } : f
                ),
              }
            : p
        ),
      };
    case 'PATCH_SIZE_OVERRIDE':
      return {
        ...state,
        plats: plats.map(p =>
          p.id === selId
            ? {
                ...p,
                fees: (Array.isArray(p.fees) ? p.fees : []).map(f =>
                  f.id === action.id
                    ? {
                        ...f,
                        sizeOverrides: { ...(f.sizeOverrides || {}), [action.key]: action.val },
                      }
                    : f
                ),
              }
            : p
        ),
      };
    default:
      return state;
  }
}

function PlatformRow({ platform, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '10px 16px',
        fontSize: 13,
        border: 'none',
        cursor: 'pointer',
        background: isSelected ? 'var(--accent)' : 'transparent',
        color: isSelected ? '#fff' : 'var(--text-1)',
        fontWeight: isSelected ? 600 : 400,
      }}
    >
      {platform.name}
      {platform.fees?.length > 0 && (
        <span style={{ fontSize: 11, marginLeft: 5, opacity: 0.7 }}>({platform.fees.length})</span>
      )}
    </button>
  );
}

function PlatformSelector({ plats, selId, onSelect, onAdd }) {
  return (
    <div
      style={{
        width: 160,
        borderRight: '1px solid var(--divider)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      {plats.map(p => (
        <PlatformRow
          key={p.id}
          platform={p}
          isSelected={p.id === selId}
          onClick={() => onSelect(p.id)}
        />
      ))}
      <button
        type="button"
        onClick={onAdd}
        style={{
          textAlign: 'left',
          padding: '10px 16px',
          fontSize: 12,
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 2,
        }}
      >
        <Icon.plus style={{ width: 12, height: 12 }} /> 플랫폼 추가
      </button>
    </div>
  );
}

export function PlatformSettingsModal({ platforms, onSave, onClose }) {
  const [{ plats, selId }, dispatch] = useReducer(reducer, platforms, initState);

  const sel = plats.find(p => p.id === selId) ?? null;

  /* ── save ── */
  function handleSave() {
    const cleaned = plats.map(p => ({
      ...p,
      name: (p.name || '').trim() || '플랫폼',
      fees: (Array.isArray(p.fees) ? p.fees : [])
        .filter(f => {
          // 항목명이나 금액 중 하나라도 있어야 저장 (둘 다 비어있으면 제외)
          const hasLabel = (f.label ?? '').trim().length > 0;
          const hasValue =
            parseFloat(f.value) > 0 ||
            parseFloat(f.sizeOverrides?.L) > 0 ||
            parseFloat(f.sizeOverrides?.R) > 0;
          return hasLabel || hasValue;
        })
        .map(f => {
          const out = {
            id: f.id,
            label: (f.label ?? '').trim() || '항목',
            type: f.type,
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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.5)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 300,
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(680px,96vw)',
          height: 'min(560px,92vh)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--divider)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15 }}>플랫폼 수수료 설정</span>
          <button type="button" className="btn" style={{ padding: '4px 8px' }} onClick={onClose}>
            <Icon.close style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* ── Body: 좌우 패널 ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* 좌: 플랫폼 목록 */}
          <PlatformSelector
            plats={plats}
            selId={selId}
            onSelect={id => dispatch({ type: 'SET_SEL', id })}
            onAdd={() => dispatch({ type: 'ADD_PLATFORM' })}
          />

          {/* 우: 선택된 플랫폼 에디터 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {!sel ? null : sel.id === 'default' ? (
              <div
                style={{
                  paddingTop: 40,
                  textAlign: 'center',
                  color: 'var(--text-3)',
                  fontSize: 13,
                }}
              >
                기본은 수수료 없이 판매가 그대로 마진을 계산합니다.
              </div>
            ) : (
              <>
                {/* 플랫폼명 */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-3)',
                      marginBottom: 6,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    플랫폼명
                  </div>
                  <input
                    className="form-input"
                    value={sel.name}
                    onChange={e => dispatch({ type: 'SET_PLAT_NAME', name: e.target.value })}
                    placeholder="예) 쿠팡이츠"
                    style={{ maxWidth: 220 }}
                  />
                </div>

                {/* 수수료 항목 */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-3)',
                      marginBottom: 10,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    수수료 항목
                  </div>

                  {sel.fees.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 10 }}>
                      항목을 추가하세요.
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {sel.fees.map((f, i) => (
                      <FeeRow
                        key={f.id}
                        f={f}
                        isLast={i === sel.fees.length - 1}
                        onPatch={patch => dispatch({ type: 'PATCH_FEE', id: f.id, patch })}
                        onSizeOverride={(k, v) =>
                          dispatch({ type: 'PATCH_SIZE_OVERRIDE', id: f.id, key: k, val: v })
                        }
                        onDelete={() => dispatch({ type: 'DELETE_FEE', id: f.id })}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => dispatch({ type: 'ADD_FEE' })}
                    style={{ fontSize: 11, marginTop: 10 }}
                  >
                    <Icon.plus style={{ width: 11, height: 11 }} /> 항목 추가
                  </button>
                </div>

                {/* 삭제 */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: 16,
                    borderTop: '1px solid var(--divider)',
                  }}
                >
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => dispatch({ type: 'DELETE_PLATFORM', id: sel.id })}
                    style={{ fontSize: 11, color: 'var(--negative)' }}
                  >
                    <Icon.trash style={{ width: 11, height: 11 }} /> 이 플랫폼 삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '12px 20px',
            borderTop: '1px solid var(--divider)',
            flexShrink: 0,
          }}
        >
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="button" className="btn primary" onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
