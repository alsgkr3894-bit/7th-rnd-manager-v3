'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { INGREDIENT_PHOTO_SLOTS } from '@/lib/ingredient';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';

function OriginSuggest({ value, onChange, suggestions = [], placeholder = '' }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const blurTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    },
    []
  );

  function closeSoon() {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      setOpen(false);
      setHi(-1);
      blurTimerRef.current = null;
    }, 150);
  }

  const filtered = value
    ? suggestions
        .filter(
          s =>
            s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
        )
        .slice(0, 10)
    : [];

  function handleKeyDown(e) {
    if (!open || !filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && hi >= 0) {
      e.preventDefault();
      onChange(filtered[hi]);
      setOpen(false);
      setHi(-1);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHi(-1);
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="form-input"
        value={value}
        placeholder={placeholder}
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
          setHi(-1);
        }}
        onFocus={() => {
          if (value) setOpen(true);
        }}
        onBlur={closeSoon}
        onKeyDown={handleKeyDown}
      />
      {open && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            left: 0,
            right: 0,
            zIndex: 200,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,.12)',
            maxHeight: 180,
            overflowY: 'auto',
          }}
        >
          {filtered.map((s, i) => (
            <div
              key={s}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: 13,
                background: i === hi ? 'var(--accent-soft)' : 'transparent',
                color: i === hi ? 'var(--accent-text)' : 'var(--text-1)',
                fontWeight: i === hi ? 600 : 400,
              }}
              onMouseDown={e => {
                e.preventDefault();
                onChange(s);
                setOpen(false);
                setHi(-1);
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PhotoSection({ formPhotos, photoInputRefs, onPhotoFile, onRemovePhoto }) {
  return (
    <Field label="사진" hint="포장·상세정보·실물 사진을 각각 1장씩 등록">
      <div className="ingredient-photo-slot-grid">
        {INGREDIENT_PHOTO_SLOTS.map(slot => {
          const photo = formPhotos[slot.key];
          const inputRef = photoInputRefs[slot.key];
          return (
            <div key={slot.key} className="ingredient-photo-slot">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={e => {
                  onPhotoFile(slot.key, e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                className="ingredient-photo-preview"
                onClick={() => inputRef.current?.click()}
                aria-label={`${slot.label} 선택`}
              >
                {photo?.data ? (
                  <img src={photo.data} alt={photo.name || slot.label} />
                ) : (
                  <Icon.plus style={{ width: 18, height: 18 }} />
                )}
              </button>
              <div className="ingredient-photo-slot-copy">
                <div>{slot.label}</div>
                <span>{slot.hint}</span>
              </div>
              <div className="ingredient-photo-slot-actions">
                <button type="button" className="btn xs" onClick={() => inputRef.current?.click()}>
                  선택
                </button>
                {photo?.data && (
                  <button
                    type="button"
                    className="btn xs ghost"
                    onClick={() => onRemovePhoto(slot.key)}
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Field>
  );
}

export function OriginSection({ origin, originHidden, originSuggestions, onSet }) {
  const items = Array.isArray(origin) ? origin : [];
  return (
    <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          원산지 정보
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              color: originHidden ? 'var(--warn)' : 'var(--text-3)',
            }}
          >
            <input
              type="checkbox"
              checked={originHidden}
              onChange={e => onSet('originHidden', e.target.checked)}
              style={{ accentColor: 'var(--warn)', width: 13, height: 13 }}
            />
            미표시대상
          </label>
          {items.length > 0 && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--accent)',
                background: 'var(--accent-soft)',
                padding: '1px 7px',
                borderRadius: 999,
              }}
            >
              {items.length}개
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn sm"
          onClick={() => onSet('origin', [...items, { displayName: '', country: '' }])}
        >
          <Icon.plus style={{ width: 12, height: 12 }} /> 추가
        </button>
      </div>
      {items.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 28px',
            gap: 4,
            marginBottom: 4,
            padding: '0 2px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>표시품목명</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>원산지 국가</div>
          <div />
        </div>
      )}
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 28px',
            gap: 4,
            marginBottom: 6,
          }}
        >
          <OriginSuggest
            value={item.displayName}
            suggestions={originSuggestions.names}
            placeholder="예) 돼지고기, 밀가루"
            onChange={v => {
              const arr = [...items];
              arr[idx] = { ...arr[idx], displayName: v };
              onSet('origin', arr);
            }}
          />
          <OriginSuggest
            value={item.country}
            suggestions={originSuggestions.countries}
            placeholder="예) 국내산, 미국산"
            onChange={v => {
              const arr = [...items];
              arr[idx] = { ...arr[idx], country: v };
              onSet('origin', arr);
            }}
          />
          <button
            type="button"
            onClick={() =>
              onSet(
                'origin',
                items.filter((_, i) => i !== idx)
              )
            }
            style={{
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              padding: 0,
            }}
          >
            <Icon.close style={{ width: 13, height: 13 }} />
          </button>
        </div>
      ))}
      {items.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '4px 0 8px' }}>
          미등록 — 추가 버튼으로 입력하세요
        </div>
      )}
    </div>
  );
}

export function AllergenSection({ allergens, onSet }) {
  const selected = Array.isArray(allergens) ? allergens : [];
  return (
    <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>
        알레르기 유발물질
        {selected.length > 0 && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--accent)',
              background: 'var(--accent-soft)',
              padding: '1px 7px',
              borderRadius: 999,
            }}
          >
            {selected.length}개 선택
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ALLERGEN_SEED.map(a => {
          const active = selected.includes(a.allergenCode);
          return (
            <button
              key={a.allergenCode}
              type="button"
              onClick={() =>
                onSet(
                  'allergens',
                  active
                    ? selected.filter(c => c !== a.allergenCode)
                    : [...selected, a.allergenCode]
                )
              }
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                border: active ? 'none' : '1px solid var(--border)',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text-3)',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {a.allergenName}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <button
          type="button"
          style={{
            marginTop: 8,
            fontSize: 11,
            color: 'var(--text-4)',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
          }}
          onClick={() => onSet('allergens', [])}
        >
          선택 초기화
        </button>
      )}
    </div>
  );
}

export function SourceField({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 64, fontWeight: 500 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          color: value ? 'var(--text-1)' : 'var(--text-4)',
          fontWeight: value ? 600 : 400,
        }}
      >
        {value || '—'}
      </span>
    </div>
  );
}

export function Field({ label, required, hint, error, errorId, children }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: 'var(--negative)', marginLeft: 2 }}>*</span>}
        {hint && (
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && (
        <div
          id={errorId}
          role="alert"
          style={{ fontSize: 12, color: 'var(--negative)', marginTop: 4 }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
