'use client';
import { useEffect, useState, useId, useRef } from 'react';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';
import {
  INGREDIENT_PHOTO_SLOTS,
  SEED_MAIN_CATEGORIES,
  SEED_HASH_TAGS,
  getPrimaryIngredientPhoto,
  normalizeIngredientPhotos,
  sortMainCategories,
} from '@/lib/ingredient';
import { SCOPE, SCOPE_ORDER, SCOPE_UNASSIGNED } from '@/lib/ingredient/constants';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { KEYS } from '@/lib/note/keys';
import { parseOptionalNonNegativeNumber } from '@/lib/parse';
import { imageFileError, resizePhoto } from '@/lib/image/resize';
import { showToast } from '@/components/Toast';

const UNIT_TYPES = ['g', 'kg', 'L', 'ml', '개', '캔', '팩', '봉', '병'];

function getLastUnitType() {
  try {
    return localStorage.getItem(KEYS.INGREDIENT_LAST_UNIT_TYPE) || 'g';
  } catch {
    return 'g';
  }
}

/** 원산지 표시품목명·국가 자동완성 드롭다운 */
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

const TEMP_OPTIONS = ['냉장', '냉동', '상온', '공산품'];

const EMPTY = {
  ingredientName: '',
  productCode: '',
  category: '',
  tags: [],
  manufacturer: '',
  discontinued: false,
  temperature: '',
  baseQuantity: '',
  baseUnitType: getLastUnitType(),
  taxType: '과세',
  priceOverride: '',
  scope: '',
  note: '',
  photo: null,
  photos: normalizeIngredientPhotos(null),
  // 원산지·알레르기
  origin: [], // [{displayName, country}] — 복수 가능
  originHidden: false, // 원산지 미표시대상 여부
  allergens: [], // ['AL01','AL06',…]
};

export function IngredientForm({
  initial,
  copyFrom = null, // 복사해서 추가 — 원본 데이터로 신규 폼 프리필(제품코드는 비움)
  onSave,
  onClose,
  extraCategories = [],
  originSuggestions = { names: [], countries: [] },
  existingProductCodes = [], // 중복 검사용 — 부모가 현재 등록된 코드 목록 전달
}) {
  const isJetteLinked = !!initial?.jetteLinked;
  // 시드 분류 + 실제 사용 중인 분류(직접입력 포함) 합본 → 직접입력 분류도 다음부터 드롭다운에 노출
  const catOptions = sortMainCategories([
    ...new Set([...SEED_MAIN_CATEGORIES, ...extraCategories].filter(Boolean)),
  ]);
  // 초기 폼 값: 편집(initial) > 복사(copyFrom, 제품코드 비우고 이름에 '복사' 접미) > 빈값
  const buildInitialForm = () => {
    if (initial) return toForm(initial);
    if (copyFrom) {
      const base = toForm(copyFrom);
      return {
        ...base,
        productCode: '',
        ingredientName: `${base.ingredientName || copyFrom.displayName || ''} 복사`.trim(),
      };
    }
    return EMPTY;
  };
  const [form, setForm] = useState(buildInitialForm);
  const [tagInput, setTagInput] = useState('');
  const [customCat, setCustomCat] = useState(() => {
    const cat = initial?.category || copyFrom?.category;
    return !!cat && !catOptions.includes(cat);
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const datalistId = useId();
  const packagingPhotoInputRef = useRef(null);
  const detailPhotoInputRef = useRef(null);
  const actualPhotoInputRef = useRef(null);
  const photoInputRefs = {
    packaging: packagingPhotoInputRef,
    detail: detailPhotoInputRef,
    actual: actualPhotoInputRef,
  };
  const initialFormRef = useRef(JSON.stringify(buildInitialForm()));
  const isDirty = JSON.stringify(form) !== initialFormRef.current;
  useBeforeUnload(isDirty);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function addTag(t) {
    const tag = (t || '').trim();
    if (!tag) return;
    setForm(f => {
      const cur = f.tags || [];
      if (cur.includes(tag)) return f;
      return { ...f, tags: [...cur, tag] };
    });
    setTagInput('');
  }
  function removeTag(t) {
    setForm(f => ({ ...f, tags: (f.tags || []).filter(x => x !== t) }));
  }

  function validate() {
    const e = {};
    if (!isJetteLinked && !form.ingredientName.trim()) e.ingredientName = '재료명을 입력하세요';
    if (!parseOptionalNonNegativeNumber(form.baseQuantity).ok) {
      e.baseQuantity = '0 이상의 숫자만 입력하세요';
    }
    if (!isJetteLinked && !parseOptionalNonNegativeNumber(form.priceOverride).ok) {
      e.priceOverride = '0 이상의 숫자만 입력하세요';
    }
    // 제품코드 중복 검사 — 신규 등록 또는 코드 변경 시
    const newCode = (form.productCode || '').trim();
    const origCode = (initial?.productCode || '').trim();
    if (
      newCode &&
      newCode.toUpperCase() !== origCode.toUpperCase() &&
      existingProductCodes.some(c => c.toUpperCase() === newCode.toUpperCase())
    ) {
      e.productCode = `이미 등록된 제품코드입니다: ${newCode}`;
    }
    return e;
  }

  useKeyboardSave(() => handleSubmit({ preventDefault() {} }));

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const baseQuantity = parseOptionalNonNegativeNumber(form.baseQuantity).value;
      const priceOverride = parseOptionalNonNegativeNumber(form.priceOverride).value;
      // origin: 표시품목명·원산지 둘 다 있어야 저장 (빈값 항목이 DB에 누적되지 않도록)
      const origin = (form.origin || [])
        .filter(it => it.country?.trim() && it.displayName?.trim())
        .map(it => ({ displayName: it.displayName.trim(), country: it.country.trim() }));
      const originValue = origin.length ? origin : null;
      const data = {
        ...form,
        baseQuantity,
        origin: originValue,
        originHidden: form.originHidden === true,
        allergens: form.allergens || [],
      };
      data.photos = normalizeIngredientPhotos(form.photos, form.photo);
      data.photo = getPrimaryIngredientPhoto({ photos: data.photos });
      if (isJetteLinked) {
        // 제때 연동 항목은 수동단가 입력칸이 없으므로 payload에서 제외 → 기존값 보존
        delete data.priceOverride;
      } else {
        data.priceOverride = priceOverride;
      }
      await onSave(data);
      try {
        localStorage.setItem(KEYS.INGREDIENT_LAST_UNIT_TYPE, data.baseUnitType || 'g');
      } catch {}
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoFile(slotKey, file) {
    if (!file) return;
    const error = imageFileError(file);
    if (error) {
      showToast(error, 'warn');
      return;
    }
    try {
      const photo = await resizePhoto(file);
      setForm(f => {
        const photos = normalizeIngredientPhotos(f.photos, f.photo);
        const nextPhotos = { ...photos, [slotKey]: photo };
        return {
          ...f,
          photos: nextPhotos,
          photo: getPrimaryIngredientPhoto({ photos: nextPhotos }),
        };
      });
    } catch (err) {
      showToast(err?.message || '사진 처리 실패', 'warn');
    }
  }

  function removePhoto(slotKey) {
    setForm(f => {
      const photos = normalizeIngredientPhotos(f.photos, f.photo);
      const nextPhotos = { ...photos, [slotKey]: null };
      return {
        ...f,
        photos: nextPhotos,
        photo: getPrimaryIngredientPhoto({ photos: nextPhotos }),
      };
    });
  }

  const isNew = !initial;
  const title = copyFrom
    ? '식자재 복사 추가'
    : isNew
      ? '식자재 추가'
      : isJetteLinked
        ? '제때 식자재 설정'
        : '식자재 수정';
  const scopeLabel = initial?.scope || (initial?.hasRecord ? SCOPE.EXCLUSIVE : SCOPE.GENERIC);
  const formPhotos = normalizeIngredientPhotos(form.photos, form.photo);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.4)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 200,
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(560px, 95vw)',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '24px 28px',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {title}
            {copyFrom && (
              <span
                style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-3)' }}
              >
                (원본: {copyFrom.ingredientName || copyFrom.displayName || copyFrom.productName})
              </span>
            )}
          </div>
          <button type="button" className="btn" style={{ padding: '4px 8px' }} onClick={onClose}>
            <Icon.close style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* 제때 연동 — source 정보 (read-only) */}
        {isJetteLinked && (
          <div
            style={{
              background: 'var(--surface-2)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 16,
              fontSize: 13,
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 700 }}>{initial.productName}</div>
              <span
                className="chip"
                style={{
                  padding: '2px 8px',
                  fontSize: 11,
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-text)',
                }}
              >
                {scopeLabel}
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px 16px',
                fontSize: 12,
                color: 'var(--text-2)',
              }}
            >
              <SourceField label="제품코드" value={initial.productCode} />
              <SourceField label="온도" value={initial.temperature} />
              <SourceField label="판매단위" value={initial.salesUnit} />
              <SourceField label="과세구분" value={initial.taxType} />
              <SourceField
                label="부가세포함단가"
                value={
                  initial.priceWithTax != null ? `${formatNumber(initial.priceWithTax)}원` : null
                }
              />
            </div>
            <div
              style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, fontStyle: 'italic' }}
            >
              ※ 위 값들은 제때 가격파일에서 자동 가져옵니다 (수정 불가)
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          aria-busy={saving}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <Field
            label="재료명"
            required={!isJetteLinked}
            error={errors.ingredientName}
            errorId="ingredientName-error"
            hint={isJetteLinked ? '비워두면 제때 제품명 자동 사용' : undefined}
          >
            <input
              className="form-input"
              value={form.ingredientName}
              aria-describedby={errors.ingredientName ? 'ingredientName-error' : undefined}
              onChange={e => set('ingredientName', e.target.value)}
              placeholder={isJetteLinked ? initial.displayName : '예) 모짜렐라치즈'}
            />
          </Field>

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
                        handlePhotoFile(slot.key, e.target.files?.[0]);
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
                      <button
                        type="button"
                        className="btn xs"
                        onClick={() => inputRef.current?.click()}
                      >
                        선택
                      </button>
                      {photo?.data && (
                        <button
                          type="button"
                          className="btn xs ghost"
                          onClick={() => removePhoto(slot.key)}
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

          {/* 분류 (메인 1개) */}
          <Field label="분류" hint="메인 카테고리 1개 (예: 토핑재료, 엣지, 사이드)">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {customCat ? (
                <input
                  className="form-input"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  placeholder="직접 입력"
                  style={{ flex: 1 }}
                />
              ) : (
                <select
                  className="form-input"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">미분류</option>
                  {catOptions.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className="btn"
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                onClick={() => {
                  setCustomCat(v => !v);
                  set('category', '');
                }}
              >
                {customCat ? '목록에서 선택' : '직접 입력'}
              </button>
            </div>
          </Field>

          {/* 해시태그 (멀티) */}
          <Field label="#태그" hint="여러 개 입력 가능 (예: 육가공류, 수산류, 치즈류)">
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                alignItems: 'center',
                padding: '6px 8px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                minHeight: 36,
              }}
            >
              {(form.tags || []).map(t => (
                <span
                  key={t}
                  style={{
                    padding: '3px 6px 3px 10px',
                    fontSize: 12,
                    fontWeight: 500,
                    background: 'var(--surface-2)',
                    color: 'var(--text-2)',
                    borderRadius: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    style={{
                      border: 0,
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'inline-flex',
                      color: 'inherit',
                      opacity: 0.6,
                    }}
                  >
                    <Icon.close style={{ width: 11, height: 11 }} />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                list={datalistId}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInput);
                  } else if (e.key === 'Backspace' && !tagInput && (form.tags || []).length) {
                    removeTag(form.tags[form.tags.length - 1]);
                  }
                }}
                onBlur={() => addTag(tagInput)}
                placeholder={(form.tags || []).length ? '' : '예) 육가공류, 수산류'}
                style={{
                  flex: 1,
                  minWidth: 120,
                  border: 0,
                  outline: 0,
                  background: 'transparent',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  color: 'var(--text-1)',
                  padding: '2px 4px',
                }}
              />
              <datalist id={datalistId}>
                {SEED_HASH_TAGS.map(t => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </Field>

          <Field label="제조사">
            <input
              className="form-input"
              value={form.manufacturer}
              onChange={e => set('manufacturer', e.target.value)}
              placeholder="예) CJ제일제당, 매일유업"
            />
          </Field>

          <Field label="단종 처리" hint="단종 카테고리에만 표시되며, 일반 목록에서 제외됩니다">
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={!!form.discontinued}
                onChange={e => set('discontinued', e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
              />
              단종된 제품으로 표시
            </label>
          </Field>

          {!isJetteLinked && (
            <Field
              label="제때 제품코드"
              hint="입력하면 제때 가격파일과 자동 연동"
              error={errors.productCode}
              errorId="productCode-error"
            >
              <input
                className="form-input"
                value={form.productCode}
                onChange={e => set('productCode', e.target.value)}
                placeholder="예) CC310001 (없으면 비워두세요)"
              />
            </Field>
          )}

          <Field
            label="포장수량"
            hint={
              isJetteLinked
                ? '향후 원가표 연동 시 자동 입력 (현재는 수동)'
                : 'g·개당 단가 자동 계산에 사용'
            }
            error={errors.baseQuantity}
            errorId="baseQuantity-error"
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.baseQuantity}
                aria-describedby={errors.baseQuantity ? 'baseQuantity-error' : undefined}
                onChange={e => set('baseQuantity', e.target.value)}
                placeholder="예) 1000"
                style={{ flex: 1 }}
              />
              <select
                className="form-input"
                value={form.baseUnitType}
                onChange={e => set('baseUnitType', e.target.value)}
                style={{ width: 80 }}
              >
                {UNIT_TYPES.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          {!isJetteLinked && (
            <>
              <Field label="보관 온도">
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    <input
                      type="radio"
                      value=""
                      checked={form.temperature === ''}
                      onChange={() => set('temperature', '')}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span style={{ color: 'var(--text-3)' }}>미지정</span>
                  </label>
                  {TEMP_OPTIONS.map(t => (
                    <label
                      key={t}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      <input
                        type="radio"
                        value={t}
                        checked={form.temperature === t}
                        onChange={() => set('temperature', t)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="과세구분">
                <div style={{ display: 'flex', gap: 12 }}>
                  {['과세', '면세'].map(t => (
                    <label
                      key={t}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      <input
                        type="radio"
                        value={t}
                        checked={form.taxType === t}
                        onChange={() => set('taxType', t)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </Field>

              <Field
                label="수동 단가 (부가세포함)"
                hint="제때 연동 없을 때 사용"
                error={errors.priceOverride}
                errorId="priceOverride-error"
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={form.priceOverride}
                    aria-describedby={errors.priceOverride ? 'priceOverride-error' : undefined}
                    onChange={e => set('priceOverride', e.target.value)}
                    placeholder="예) 7680"
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    원
                  </span>
                </div>
              </Field>
            </>
          )}

          <Field
            label="전용/범용"
            hint={
              isJetteLinked
                ? '제때 관리품목 분류로 저장됩니다 (가격비교와 공유)'
                : '제때 연동 없는 항목은 직접 지정 (미지정 시 이슈에 표시)'
            }
          >
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                <input
                  type="radio"
                  name="scope"
                  value=""
                  checked={form.scope === ''}
                  onChange={() => set('scope', '')}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span style={{ color: 'var(--text-3)' }}>{SCOPE_UNASSIGNED}</span>
              </label>
              {SCOPE_ORDER.map(s => (
                <label
                  key={s}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={s}
                    checked={form.scope === s}
                    onChange={() => set('scope', s)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  {s}
                </label>
              ))}
            </div>
          </Field>

          <Field label="비고">
            <input
              className="form-input"
              value={form.note}
              onChange={e => set('note', e.target.value)}
              placeholder="예) 냉장 보관 / 수입산"
            />
          </Field>

          {/* ── 원산지 ── */}
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
                    color: form.originHidden ? 'var(--warn)' : 'var(--text-3)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.originHidden}
                    onChange={e => set('originHidden', e.target.checked)}
                    style={{ accentColor: 'var(--warn)', width: 13, height: 13 }}
                  />
                  미표시대상
                </label>
                {form.origin?.length > 0 && (
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
                    {form.origin.length}개
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn sm"
                onClick={() =>
                  set('origin', [...(form.origin || []), { displayName: '', country: '' }])
                }
              >
                <Icon.plus style={{ width: 12, height: 12 }} /> 추가
              </button>
            </div>
            {(form.origin || []).length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 28px',
                  gap: 4,
                  marginBottom: 4,
                  padding: '0 2px',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>
                  표시품목명
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)' }}>
                  원산지 국가
                </div>
                <div />
              </div>
            )}
            {(form.origin || []).map((item, idx) => (
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
                    const arr = [...form.origin];
                    arr[idx] = { ...arr[idx], displayName: v };
                    set('origin', arr);
                  }}
                />
                <OriginSuggest
                  value={item.country}
                  suggestions={originSuggestions.countries}
                  placeholder="예) 국내산, 미국산"
                  onChange={v => {
                    const arr = [...form.origin];
                    arr[idx] = { ...arr[idx], country: v };
                    set('origin', arr);
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      'origin',
                      form.origin.filter((_, i) => i !== idx)
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
            {(form.origin || []).length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '4px 0 8px' }}>
                미등록 — 추가 버튼으로 입력하세요
              </div>
            )}
          </div>

          {/* ── 알레르기 유발물질 ── */}
          <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>
              알레르기 유발물질
              {form.allergens?.length > 0 && (
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
                  {form.allergens.length}개 선택
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALLERGEN_SEED.map(a => {
                const active = (form.allergens || []).includes(a.allergenCode);
                return (
                  <button
                    key={a.allergenCode}
                    type="button"
                    onClick={() =>
                      set(
                        'allergens',
                        active
                          ? (form.allergens || []).filter(c => c !== a.allergenCode)
                          : [...(form.allergens || []), a.allergenCode]
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
            {form.allergens?.length > 0 && (
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
                onClick={() => set('allergens', [])}
              >
                선택 초기화
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? '저장 중…' : isNew ? '추가' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function SourceField({ label, value }) {
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

function Field({ label, required, hint, error, errorId, children }) {
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

/** origin 값(배열 또는 구버전 객체)을 폼용 [{displayName, country}] 배열로 변환 */
function toOriginItems(v) {
  if (!v) return [];
  if (Array.isArray(v))
    return v.map(it => ({ displayName: it.displayName || '', country: it.country || '' }));
  if (v.country) return [{ displayName: v.displayName || '', country: v.country || '' }]; // 구버전 호환
  return [];
}

function toForm(r) {
  const category = r.category || (Array.isArray(r.categories) && r.categories[0]) || '';
  const tags =
    Array.isArray(r.tags) && r.tags.length
      ? r.tags
      : Array.isArray(r.categories)
        ? r.categories.slice(1)
        : [];
  return {
    ingredientName: r.ingredientName || '',
    productCode: r.productCode || '',
    category,
    tags,
    manufacturer: r.manufacturer || '',
    discontinued: r.discontinued === true,
    baseQuantity: r.baseQuantity != null ? String(r.baseQuantity) : '',
    baseUnitType: r.baseUnitType || 'g',
    taxType: r.taxType || '과세',
    priceOverride: r.priceOverride != null ? String(r.priceOverride) : '',
    scope: r.scope && r.scope !== SCOPE_UNASSIGNED ? r.scope : '',
    note: r.note || '',
    photos: normalizeIngredientPhotos(r.photos, r.photo),
    photo: getPrimaryIngredientPhoto(r),
    temperature: r.temperature || '',
    origin: toOriginItems(r.origin),
    originHidden: r.originHidden === true,
    allergens: Array.isArray(r.allergens) ? r.allergens : [],
  };
}
