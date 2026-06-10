'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { parseCategoryFromCode } from '@/lib/cost/menu-price/code';
import {
  MENU_CODE_MODE,
  getMenuCodeBase,
  normalizeMenuCodeForModule,
} from '@/lib/menu-master/code-policy';
import { asObjectArray } from '@/lib/ui/prop-guards';

function asText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

export function getBaseCode(m) {
  return getMenuCodeBase(m);
}

export default function MenuCodePicker({
  menuMasters = [],
  value = '',
  onChange,
  dedup = true,
  mode = null,
  placeholder = '코드·메뉴명·중분류로 검색…',
  style,
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef(null);
  const listRef = useRef(null);

  const displayList = useMemo(() => {
    const active = asObjectArray(menuMasters).filter(
      m => m.status !== 'discontinued' && m.menuCode
    );
    const effectiveMode = mode || (dedup ? MENU_CODE_MODE.BASE : MENU_CODE_MODE.FULL);
    if (effectiveMode === MENU_CODE_MODE.FULL) {
      return active.map(m => ({
        code: normalizeMenuCodeForModule(m, { mode: MENU_CODE_MODE.FULL }),
        menuName: asText(m.menuName),
        subCategory: asText(m.subCategory),
        category: asText(m.category),
        sizes: asText(m.size) ? [asText(m.size)] : [],
      }));
    }
    const seen = new Map();
    for (const m of active) {
      const base = normalizeMenuCodeForModule(m, { mode: MENU_CODE_MODE.BASE });
      const size = asText(m.size);
      if (!seen.has(base)) {
        seen.set(base, {
          code: base,
          menuName: asText(m.menuName),
          subCategory: asText(m.subCategory),
          category: asText(m.category),
          sizes: size ? [size] : [],
        });
      } else if (size) {
        const bucket = seen.get(base);
        if (!bucket.sizes.includes(size)) bucket.sizes.push(size);
      }
    }
    return [...seen.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [menuMasters, dedup, mode]);

  const selected = value ? displayList.find(m => m.code === value) : null;

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return displayList.slice(0, 50);
    return displayList
      .filter(
        m =>
          (m.code || '').toLowerCase().includes(term) ||
          (m.menuName || '').toLowerCase().includes(term) ||
          (m.subCategory || '').toLowerCase().includes(term) ||
          (m.category || '').toLowerCase().includes(term)
      )
      .slice(0, 50);
  }, [q, displayList]);

  useEffect(() => {
    setActiveIdx(-1);
  }, [results]);

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    listRef.current.children[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = m => {
    if (!m?.code) return;
    const meta = parseCategoryFromCode(m.code);
    onChange?.(m.code, meta);
    setQ('');
    setOpen(false);
    setActiveIdx(-1);
  };
  const handleClear = () => {
    onChange?.('', {});
    setQ('');
    setActiveIdx(-1);
  };

  const handleKeyDown = e => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) handleSelect(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {selected ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 10px',
            background: 'var(--accent-soft)',
            border: '1.5px solid var(--accent)',
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              color: 'var(--accent-text)',
              flexShrink: 0,
            }}
          >
            {selected.code}
          </span>
          <span style={{ color: 'var(--text-2)' }}>{selected.menuName}</span>
          {selected.subCategory && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-4)',
                background: 'var(--surface-2)',
                padding: '1px 6px',
                borderRadius: 4,
                flexShrink: 0,
              }}
            >
              {selected.subCategory}
            </span>
          )}
          {selected.sizes.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>
              ({[...selected.sizes].sort().join(' · ')})
            </span>
          )}
          <button
            onClick={handleClear}
            style={{
              marginLeft: 'auto',
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-3)',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <Icon.close style={{ width: 13, height: 13 }} />
          </button>
        </div>
      ) : (
        <div className="filter-search" style={{ gap: 6 }} onClick={() => setOpen(true)}>
          <Icon.search style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            value={q}
            onChange={e => {
              setQ(e.target.value);
              setOpen(true);
              setActiveIdx(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              displayList.length === 0
                ? '메뉴 마스터가 없습니다 (메뉴 마스터 먼저 등록)'
                : placeholder
            }
            disabled={displayList.length === 0}
            style={{
              background: 'transparent',
              border: 0,
              outline: 0,
              flex: 1,
              fontSize: 13,
              fontFamily: 'inherit',
              color: 'var(--text-1)',
            }}
          />
        </div>
      )}

      {open && !selected && results.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 200,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-md)',
            maxHeight: 260,
            overflowY: 'auto',
            marginTop: 2,
          }}
        >
          {results.map((m, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={m.code}
                onClick={() => handleSelect(m)}
                onMouseEnter={() => setActiveIdx(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 14px',
                  border: 0,
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--divider)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--accent-text)',
                    background: 'var(--accent-soft)',
                    padding: '1px 6px',
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                >
                  {m.code}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: isActive ? 'var(--accent-text)' : 'var(--text-1)',
                      fontWeight: 500,
                    }}
                  >
                    {m.menuName}
                  </div>
                  {m.subCategory && (
                    <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>
                      {m.subCategory}
                    </div>
                  )}
                </div>
                {m.sizes.length > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>
                    {[...m.sizes].sort().join(' / ')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
