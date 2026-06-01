'use client';
import { useState, useRef } from 'react';

/**
 * ComboBox — 자유 입력 + 입력 기반 자동완성 드롭다운.
 *
 * native <datalist>와 달리 입력 substring으로 **필터된 옵션만** 표시하고,
 * options를 호출부에서 스코프(예: 선택한 대분류의 중분류만)해 넘길 수 있다.
 *
 * @param {string}   value
 * @param {(v:string)=>void} onChange
 * @param {string[]} options    - 후보 목록(이미 스코프된 상태로 전달)
 * @param {string}   [placeholder]
 * @param {object}   [style]      - 래퍼 div 스타일
 * @param {object}   [inputStyle] - input 스타일
 * @param {number}   [maxItems=30]
 */
export function ComboBox({ value, onChange, options = [], placeholder, style, inputStyle, inputClassName, maxItems = 30 }) {
  const [open, setOpen]     = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef(null);

  const q = (value || '').trim().toLowerCase();
  const filtered = (q ? options.filter(o => o.toLowerCase().includes(q)) : options).slice(0, maxItems);

  function pick(opt) {
    onChange(opt);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e) {
    if (!open && e.key === 'ArrowDown') { setOpen(true); return; }
    if (e.key === 'ArrowDown')      { e.preventDefault(); setActive(a => Math.min(filtered.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && active >= 0 && filtered[active]) { e.preventDefault(); pick(filtered[active]); }
    else if (e.key === 'Escape')    { setOpen(false); setActive(-1); }
  }

  return (
    <div style={{ position: 'relative', ...style }}>
      <input
        value={value || ''}
        placeholder={placeholder}
        autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 120); }}
        onKeyDown={onKeyDown}
        className={inputClassName}
        style={{ width: '100%', ...inputStyle }}
      />
      {open && filtered.length > 0 && (
        <div
          onMouseDown={e => { clearTimeout(blurTimer.current); e.preventDefault(); }}
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 40, marginTop: 2,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
            maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--shadow-md)',
          }}
        >
          {filtered.map((opt, i) => (
            <button
              key={opt}
              type="button"
              onClick={() => pick(opt)}
              onMouseEnter={() => setActive(i)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px',
                fontSize: 13, border: 0, cursor: 'pointer', fontFamily: 'inherit',
                background: i === active ? 'var(--accent-soft)' : 'transparent',
                color: 'var(--text-1)',
              }}
            >{opt}</button>
          ))}
        </div>
      )}
    </div>
  );
}
