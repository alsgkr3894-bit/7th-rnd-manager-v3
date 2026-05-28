'use client';
import { useState, useRef, useMemo } from 'react';

/**
 * TagInput — comma-string value ↔ visual chip input with autocomplete
 *
 * Props:
 *   value      string  comma-joined tags
 *   onChange   fn(newValue: string)
 *   suggestions  string[]  existing tags to suggest
 *   placeholder  string
 */
export function TagInput({ value = '', onChange, suggestions = [], placeholder = '태그 입력 후 Enter…' }) {
  const tags  = (value || '').split(',').map(t => t.trim()).filter(Boolean);
  const [input, setInput]     = useState('');
  const [open,  setOpen]      = useState(false);
  const inputRef = useRef(null);

  const matches = useMemo(() =>
    input.length === 0 ? [] : suggestions.filter(s =>
      s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
    ).slice(0, 7),
  [input, suggestions, tags]);

  function emit(newTags) { onChange(newTags.join(', ')); }

  function add(tag) {
    const t = tag.trim();
    if (!t || tags.includes(t)) { setInput(''); setOpen(false); return; }
    emit([...tags, t]);
    setInput('');
    setOpen(false);
  }

  function remove(tag) { emit(tags.filter(t => t !== tag)); }

  function handleKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) add(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      remove(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div style={{ position:'relative' }}>
      <div
        style={{
          display:'flex', flexWrap:'wrap', gap:5, alignItems:'center',
          border:'1px solid var(--border-strong)', borderRadius:'var(--radius-sm)',
          padding:'5px 8px', minHeight:40, background:'var(--surface)', cursor:'text',
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map(t => (
          <span key={t} style={{
            display:'inline-flex', alignItems:'center', gap:4,
            background:'var(--accent-soft)', color:'var(--accent-text)',
            fontSize:12, fontWeight:600, padding:'2px 8px 2px 10px', borderRadius:10,
            animation:'chip-pop 180ms cubic-bezier(0.2,0.8,0.2,1) both',
          }}>
            {t}
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); remove(t); }}
              style={{
                background:'none', border:'none', cursor:'pointer',
                padding:'0 0 0 2px', lineHeight:1, color:'inherit',
                fontSize:14, opacity:.65, fontWeight:700,
              }}
            >×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onKeyDown={handleKey}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)}
          placeholder={tags.length === 0 ? placeholder : ''}
          style={{
            border:'none', outline:'none', background:'transparent',
            fontFamily:'inherit', fontSize:13, color:'var(--text-1)',
            minWidth:100, flex:1, padding:'2px 0',
          }}
        />
      </div>
      {open && matches.length > 0 && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:200,
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:8, boxShadow:'0 6px 20px rgba(0,0,0,0.12)', overflow:'hidden',
        }}>
          {matches.map((s, i) => (
            <button key={s} type="button"
              onMouseDown={e => { e.preventDefault(); add(s); }}
              style={{
                display:'block', width:'100%', padding:'9px 14px', textAlign:'left',
                background:'transparent', border:'none', borderBottom: i < matches.length - 1 ? '1px solid var(--border)' : 'none',
                cursor:'pointer', fontSize:13, color:'var(--text-2)', fontFamily:'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ color:'var(--text-4)', marginRight:4 }}>#</span>{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
