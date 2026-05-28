'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { parseCategoryFromCode } from '@/lib/cost/menu-price/code';

/** menu_master 항목에서 사이즈 suffix를 제거한 베이스코드 반환 */
export function getBaseCode(m) {
  if (!m.size) return m.menuCode;
  const suffix = `-${m.size}`;
  return m.menuCode.endsWith(suffix) ? m.menuCode.slice(0, -suffix.length) : m.menuCode;
}

/**
 * menu_master 목록을 받아 코드 검색·선택 UI를 제공하는 공유 컴포넌트.
 *
 * Props:
 *   menuMasters  — getAllMenuMaster() 결과 배열
 *   value        — 현재 선택된 menuCode (베이스코드 or 풀코드)
 *   onChange     — (menuCode: string, meta: { category, subCategory }) => void
 *   dedup        — true(기본): L/R 중복 제거해 베이스코드 단위로 표시
 *                  false: 전체 코드 그대로 표시 (메뉴 마스터 자체 관리 등에 사용)
 *   placeholder  — 검색 인풋 placeholder
 *   style        — 컨테이너 style 오버라이드
 */
export default function MenuCodePicker({
  menuMasters = [],
  value = '',
  onChange,
  dedup = true,
  placeholder = '코드·메뉴명·중분류로 검색…',
  style,
}) {
  const [q, setQ]       = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  /* 단종(discontinued) 제외 후 중복 제거 */
  const displayList = useMemo(() => {
    const active = menuMasters.filter(m => m.status !== 'discontinued');
    if (!dedup) {
      return active.map(m => ({
        code: m.menuCode, menuName: m.menuName,
        subCategory: m.subCategory, category: m.category,
        sizes: m.size ? [m.size] : [],
      }));
    }
    const seen = new Map();
    for (const m of active) {
      const base = getBaseCode(m);
      if (!seen.has(base)) {
        seen.set(base, { code: base, menuName: m.menuName, subCategory: m.subCategory, category: m.category, sizes: m.size ? [m.size] : [] });
      } else if (m.size) {
        seen.get(base).sizes.push(m.size);
      }
    }
    return [...seen.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [menuMasters, dedup]);

  const selected = value ? displayList.find(m => m.code === value) : null;

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return displayList.slice(0, 50);
    return displayList.filter(m =>
      (m.code || '').toLowerCase().includes(term) ||
      (m.menuName || '').toLowerCase().includes(term) ||
      (m.subCategory || '').toLowerCase().includes(term) ||
      (m.category || '').toLowerCase().includes(term)
    ).slice(0, 50);
  }, [q, displayList]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (m) => {
    const meta = parseCategoryFromCode(m.code);
    onChange(m.code, meta);
    setQ('');
    setOpen(false);
  };
  const handleClear = () => { onChange('', {}); setQ(''); };

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {selected ? (
        /* 선택된 상태 */
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
          background: 'var(--accent-soft)', border: '1.5px solid var(--accent)',
          borderRadius: 8, fontSize: 13,
        }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-text)', flexShrink: 0 }}>
            {selected.code}
          </span>
          <span style={{ color: 'var(--text-2)' }}>{selected.menuName}</span>
          {selected.subCategory && (
            <span style={{ fontSize: 11, color: 'var(--text-4)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>
              {selected.subCategory}
            </span>
          )}
          {selected.sizes.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>
              ({selected.sizes.sort().join(' · ')})
            </span>
          )}
          <button onClick={handleClear}
            style={{ marginLeft: 'auto', border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-3)', padding: 0, flexShrink: 0 }}>
            <Icon.close style={{ width: 13, height: 13 }} />
          </button>
        </div>
      ) : (
        /* 미선택 — 검색 인풋 */
        <div className="filter-search" style={{ gap: 6 }} onClick={() => setOpen(true)}>
          <Icon.search style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={displayList.length === 0 ? '메뉴 마스터가 없습니다 (메뉴 마스터 먼저 등록)' : placeholder}
            disabled={displayList.length === 0}
            style={{ background: 'transparent', border: 0, outline: 0, flex: 1, fontSize: 13, fontFamily: 'inherit', color: 'var(--text-1)' }}
          />
        </div>
      )}

      {/* 드롭다운 */}
      {open && !selected && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,.15)',
          maxHeight: 260, overflowY: 'auto', marginTop: 2,
        }}>
          {results.map(m => (
            <button key={m.code} onClick={() => handleSelect(m)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', textAlign: 'left', padding: '8px 14px',
                border: 0, background: 'transparent', cursor: 'pointer',
                borderBottom: '1px solid var(--divider)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{
                fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                color: 'var(--accent-text)', background: 'var(--accent-soft)',
                padding: '1px 6px', borderRadius: 4, flexShrink: 0,
              }}>
                {m.code}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{m.menuName}</div>
                {m.subCategory && (
                  <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>{m.subCategory}</div>
                )}
              </div>
              {m.sizes.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>
                  {m.sizes.sort().join(' / ')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
