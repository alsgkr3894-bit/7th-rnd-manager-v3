'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  INPUT_STYLE,
  NUMERIC_INPUT_STYLE,
  STATUS,
  asText,
  ingredientAllergenText,
  ingredientInputValue,
  parseImportNumberInput,
  resolveIngredientOption,
  searchIngredientOptions,
} from './toppingImportUtils';

export function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.invalid;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '3px 8px',
        fontSize: 11,
        fontWeight: 800,
        color: cfg.color,
        background: cfg.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

export function TextImportInput({ value, onChange, placeholder, mono = false }) {
  return (
    <input
      type="text"
      value={value || ''}
      placeholder={placeholder}
      onChange={event => onChange(event.target.value)}
      style={{
        ...INPUT_STYLE,
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : undefined,
      }}
    />
  );
}

export function NumberImportInput({ value, unit, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value === '' || value == null ? '' : value}
        onChange={event => onChange(parseImportNumberInput(event.target.value))}
        style={NUMERIC_INPUT_STYLE}
      />
      {unit && <span style={{ minWidth: 18, fontSize: 10, color: 'var(--text-4)' }}>{unit}</span>}
    </div>
  );
}

export function IngredientConnectInput({ row, index, options, onIngredientInput }) {
  const committedValue = ingredientInputValue(row);
  const [query, setQuery] = useState(committedValue);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const matches = useMemo(() => searchIngredientOptions(query, options), [query, options]);

  useEffect(() => {
    if (!focused) setQuery(committedValue);
  }, [committedValue, focused]);

  function commit(value, mode = 'blur') {
    const option = resolveIngredientOption(value, options, {
      allowSingleMatch: mode === 'blur',
      allowFirst: mode === 'enter',
    });
    const nextValue = option?.label || value;
    setQuery(nextValue);
    setOpen(false);
    onIngredientInput(index, nextValue);
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        placeholder="식자재 코드/명 검색"
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          commit(query, 'blur');
        }}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={event => {
          setComposing(false);
          setQuery(event.currentTarget.value);
          setOpen(true);
        }}
        onChange={event => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={event => {
          if (composing) return;
          if (event.key === 'Enter') {
            event.preventDefault();
            commit(query, 'enter');
          }
          if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        style={INPUT_STYLE}
      />
      {open && focused && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 20,
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: 220,
            overflowY: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface)',
            boxShadow: 'var(--shadow-lg, 0 16px 36px rgba(15, 23, 42, .16))',
          }}
        >
          {matches.length ? (
            matches.map(option => (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected="false"
                onMouseDown={event => {
                  event.preventDefault();
                  commit(option.label, 'select');
                }}
                style={{
                  display: 'grid',
                  width: '100%',
                  gap: 2,
                  border: 0,
                  borderBottom: '1px solid var(--divider)',
                  padding: '8px 10px',
                  background: 'var(--surface)',
                  color: 'var(--text-1)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 800 }}>
                  {option.ingredientName || option.productCode}
                </span>
                <span className="mono muted" style={{ fontSize: 11 }}>
                  {option.productCode || '코드 없음'}
                  {option.allergenText ? ` · ${option.allergenText}` : ''}
                </span>
              </button>
            ))
          ) : (
            <div style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-4)' }}>
              일치하는 식자재가 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
