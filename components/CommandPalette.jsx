'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';
import { usePaletteItems, STATUS_ICON } from '@/lib/usePaletteItems';
import { getJSONLS, setJSONLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import { useDebounce } from '@/hooks/useDebounce';

function getRecent() {
  return getJSONLS(KEYS.PALETTE_RECENT) ?? [];
}
function saveRecent(item) {
  const list = [
    { href: item.href, label: item.label, kind: item.kind },
    ...getRecent().filter(r => r.href !== item.href),
  ].slice(0, 5);
  setJSONLS(KEYS.PALETTE_RECENT, list);
}

export default function CommandPalette({ open, onClose }) {
  const [q,         setQ]         = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [recent,    setRecent]    = useState([]);
  const inputRef = useRef(null);
  const router   = useRouter();
  const allItems = usePaletteItems(open);
  const debouncedQ = useDebounce(q, 150);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActiveIdx(0);
    setRecent(getRecent());
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') e.preventDefault();
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  const norm = s => s.toLowerCase().replace(/\s+/g, '');
  const isSearching = debouncedQ.trim().length > 0;
  const filtered = isSearching
    ? allItems.filter(x => norm(x.label).includes(norm(debouncedQ)) || (x.sub && norm(x.sub).includes(norm(debouncedQ))))
    : allItems.slice(0, 9);

  const pick = (item) => {
    saveRecent(item);
    onClose();
    router.push(item.href);
  };

  function handleKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Escape') onClose();
    else if (e.key === 'Enter' && filtered[activeIdx]) pick(filtered[activeIdx]);
  }

  const GROUPS = [
    { kind: 'sample',     label: '샘플기록' },
    { kind: 'note',       label: '메뉴개발 노트' },
    { kind: 'ingredient', label: '식자재' },
    { kind: 'menu',       label: '메뉴' },
    { kind: 'action',     label: '빠른 작업' },
  ];

  const ICO_STYLE = {
    sample:     { bg: 'var(--sample-ico-bg)',  color: 'var(--sample-ico-color)' },
    note:       { bg: 'var(--warn-soft)',       color: 'var(--warn)' },
    ingredient: { bg: 'var(--positive-soft)',   color: 'var(--positive)' },
    menu:       { bg: 'var(--accent-soft)',     color: 'var(--accent-text)' },
    action:     { bg: 'var(--note-ico-bg)',     color: 'var(--note-ico-color)' },
  };

  let flatIdx = 0;

  return (
    <div className="palette-scrim" role="presentation" onClick={onClose}>
      <div className="palette" role="dialog" aria-label="통합 검색" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="palette-input">
          <Icon.search style={{width:18, height:18, color:'var(--text-3)'}} />
          <input ref={inputRef} value={q}
            onChange={e => { setQ(e.target.value); setActiveIdx(0); }}
            onKeyDown={handleKey}
            placeholder="메뉴, 재료, 보고서, 노트, 샘플 검색"
            aria-label="검색어 입력"
            aria-controls="palette-results" />
          <kbd>ESC</kbd>
        </div>

        <div className="palette-results" id="palette-results" role="menu" aria-label="검색 결과">
          {/* 최근 방문 — 검색어 없을 때만 */}
          {!isSearching && recent.length > 0 && (
            <div>
              <div className="palette-group">최근 방문</div>
              {recent.map((r, ri) => {
                const fi = flatIdx++;
                const { bg, color } = ICO_STYLE[r.kind] || ICO_STYLE.menu;
                return (
                  <button key={'recent-' + r.href}
                    role="menuitem"
                    className={'palette-row' + (fi === activeIdx ? ' palette-row-active' : '')}
                    onMouseEnter={() => setActiveIdx(fi)}
                    onClick={() => pick(r)}>
                    <div className="palette-row-ico" style={{background: bg, color, fontSize:13}}>
                      <Icon.chevRight style={{width:14,height:14}}/>
                    </div>
                    <span className="palette-row-label">{r.label}</span>
                    <span className="palette-recent-time">{r.href}</span>
                  </button>
                );
              })}
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="palette-empty">검색 결과 없음</div>
          ) : GROUPS.map(({ kind, label }) => {
            const rows = filtered.filter(x => x.kind === kind);
            if (!rows.length) return null;
            const { bg, color } = ICO_STYLE[kind] || ICO_STYLE.menu;
            return (
              <div key={kind}>
                <div className="palette-group">{label}</div>
                {rows.map(r => {
                  const fi = flatIdx++;
                  return (
                    <button key={r.href + r.label}
                      role="menuitem"
                      className={'palette-row' + (fi === activeIdx ? ' palette-row-active' : '')}
                      onMouseEnter={() => setActiveIdx(fi)}
                      onClick={() => pick(r)}>
                      <div className="palette-row-ico" style={{background: bg, color, fontSize: 13}}>
                        {kind === 'sample'     ? (r.hasPhoto ? '📷' : '🧪')
                         : kind === 'note'       ? (STATUS_ICON[r.status] || '📝')
                         : kind === 'ingredient' ? <Icon.tag style={{width:14,height:14}}/>
                         : kind === 'menu'       ? <Icon.chevRight style={{width:14,height:14}}/>
                         : <Icon.plus style={{width:14,height:14}}/>}
                      </div>
                      <div style={{flex:1, minWidth:0}}>
                        <span className="palette-row-label">{r.label}</span>
                        {r.sub && (
                          <span style={{display:'block', fontSize:11, color:'var(--text-3)',
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                            {r.sub}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="palette-foot">
          <span><kbd>↑↓</kbd> 이동</span>
          <span><kbd>↵</kbd> 선택</span>
          <span><kbd>esc</kbd> 닫기</span>
        </div>
      </div>
    </div>
  );
}
