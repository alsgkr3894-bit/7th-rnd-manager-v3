'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';

export function IngredientSearch({ allMeta, unitPriceMap, onSelect, alreadyAdded, style }) {
  const [q,         setQ]         = useState('');
  const [open,      setOpen]      = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [rect,      setRect]      = useState(null);
  const ref     = useRef(null);
  const listRef = useRef(null);
  const addedSet = useMemo(() => new Set(alreadyAdded), [alreadyAdded]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return allMeta.filter(m =>
      m.productCode &&
      !addedSet.has(m.productCode) &&
      ((m.ingredientName || '').toLowerCase().includes(term) ||
       (m.productCode    || '').toLowerCase().includes(term))
    ).slice(0, 15);
  }, [q, allMeta, addedSet]);

  useEffect(() => { setActiveIdx(-1); }, [results]);

  const updateRect = useCallback(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setRect({ top: r.bottom + 2, left: r.left, width: r.width });
    }
  }, []);

  useEffect(() => {
    if (open) updateRect();
  }, [open, q, updateRect]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [open, updateRect]);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          !(listRef.current && listRef.current.contains(e.target))) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIdx];
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  function select(m) {
    onSelect(m);
    setQ('');
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleKeyDown(e) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) select(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  const dropdown = open && results.length > 0 && rect && createPortal(
    <div ref={listRef} style={{
      position: 'fixed', top: rect.top, left: rect.left, width: rect.width,
      zIndex: 9999,
      background: 'var(--surface-1)', border: '1px solid var(--border)',
      borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.2)',
      maxHeight: 260, overflowY: 'auto',
    }}>
      {results.map((m, idx) => {
        const info     = unitPriceMap.get(m.productCode);
        const isActive = idx === activeIdx;
        return (
          <button key={m.productCode} onClick={() => select(m)}
            onMouseEnter={() => setActiveIdx(idx)}
            style={{ display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 14px', border: 0,
              background: isActive ? 'var(--accent-soft)' : 'transparent',
              cursor: 'pointer', borderBottom: '1px solid var(--divider)' }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: isActive ? 'var(--accent-text)' : undefined }}>
              {m.ingredientName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1, display: 'flex', gap: 8 }}>
              <span style={{ fontFamily: 'monospace' }}>{m.productCode}</span>
              {info?.unitPrice != null
                ? <span>{info.unitPrice < 1 ? info.unitPrice.toFixed(2) : formatNumber(info.unitPrice)}원/{info.baseUnitType}</span>
                : <span style={{ color: '#f59e0b' }}>단가미등록</span>}
              {m.baseQuantity && <span>{formatNumber(m.baseQuantity)}{m.baseUnitType}</span>}
            </div>
          </button>
        );
      })}
    </div>,
    document.body
  );

  return (
    <div ref={ref} style={{ marginTop: 8, ...style }}>
      <div className="filter-search" style={{ gap: 6 }}>
        <Icon.search style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }}/>
        <input value={q}
          onChange={e => { setQ(e.target.value); setOpen(!!e.target.value.trim()); }}
          onFocus={() => { if (q.trim()) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="식자재 검색하여 추가… (↑↓ 방향키, Enter 선택)"/>
        {q && (
          <button onClick={() => { setQ(''); setOpen(false); }}
            aria-label="검색어 지우기"
            style={{ border: 0, background: 'transparent', cursor: 'pointer',
              color: 'var(--text-4)', padding: 0, lineHeight: 1 }}>
            <Icon.close style={{ width: 12, height: 12 }}/>
          </button>
        )}
      </div>
      {dropdown}
    </div>
  );
}
