'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './icons';
import { usePaletteItems, STATUS_ICON } from '@/lib/usePaletteItems';

export default function CommandPalette({ open, onClose }) {
  const [q,         setQ]         = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const router   = useRouter();
  const allItems = usePaletteItems(open);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActiveIdx(0);
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
  const filtered = q.trim()
    ? allItems.filter(x => norm(x.label).includes(norm(q)) || (x.sub && norm(x.sub).includes(norm(q))))
    : allItems.slice(0, 9);

  const pick = (item) => { onClose(); router.push(item.href); };

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
    <div className="palette-scrim" onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <div className="palette-input">
          <Icon.search style={{width:18, height:18, color:'var(--text-3)'}} />
          <input ref={inputRef} value={q}
            onChange={e => { setQ(e.target.value); setActiveIdx(0); }}
            onKeyDown={handleKey}
            placeholder="메뉴, 재료, 보고서, 노트, 샘플 검색" />
          <kbd>ESC</kbd>
        </div>

        <div className="palette-results">
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
