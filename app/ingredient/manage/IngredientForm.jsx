'use client';
import { useEffect, useState, useId, useRef } from 'react';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/icons';
import {
  SEED_MAIN_CATEGORIES,
  getPrimaryIngredientPhoto,
  normalizeIngredientPhotos,
  sortMainCategories,
} from '@/lib/ingredient';
import { SCOPE_UNASSIGNED } from '@/lib/ingredient/constants';
import { KEYS } from '@/lib/note/keys';
import { parseOptionalNonNegativeNumber } from '@/lib/parse';
import { imageFileError, resizePhoto } from '@/lib/image/resize';
import { showToast } from '@/components/Toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
import { AllergenSection, OriginSection, PhotoSection } from './IngredientFormSections';
import {
  BasicIngredientFields,
  IngredientCostFields,
  IngredientNameField,
} from './IngredientFormFields';
import { IngredientUsageSection } from './IngredientUsageSection';
import { useIngredientUsageSummary } from './useIngredientUsageSummary';
import { JetteLinkedSourcePanel } from './JetteLinkedSourcePanel';
import { JettePriceImportField } from './JettePriceImportField';
import { pickRememberedUnit } from './ingredientFormPrefill';

function normalizeUnitType(value) {
  return normalizeCostBaseUnit(value);
}

const EMPTY = {
  ingredientName: '',
  productCode: '',
  category: '',
  tags: [],
  manufacturer: '',
  discontinued: false,
  temperature: '',
  baseQuantity: '',
  baseUnitType: 'g',
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
  jettePriceRows = [],
}) {
  const isJetteLinked = !!initial?.jetteLinked;
  // 시드 분류 + 실제 사용 중인 분류(직접입력 포함) 합본 → 직접입력 분류도 다음부터 드롭다운에 노출
  const catOptions = sortMainCategories([
    ...new Set([...SEED_MAIN_CATEGORIES, ...extraCategories].filter(Boolean)),
  ]);
  const [lastUnitType, setLastUnitType, lastUnitHydrated] = useLocalStorage(
    KEYS.INGREDIENT_LAST_UNIT_TYPE,
    'g',
    normalizeUnitType
  );

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
    return { ...EMPTY, baseUnitType: lastUnitType, photos: normalizeIngredientPhotos(null) };
  };
  const [form, setForm] = useState(buildInitialForm);
  const [tagInput, setTagInput] = useState('');
  const [customCat, setCustomCat] = useState(() => {
    const cat = initial?.category || copyFrom?.category;
    return !!cat && !catOptions.includes(cat);
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const usageSummary = useIngredientUsageSummary(initial);
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

  // 마지막 사용 단위 복원은 폼이 아직 손대지 않은 상태일 때만 1회 적용한다.
  // (지연된 하이드레이션이 사용자가 먼저 입력한 포장수량/단위를 덮어쓰지 않도록)
  const lastUnitAppliedRef = useRef(false);
  useEffect(() => {
    if (lastUnitAppliedRef.current) return;
    if (!lastUnitHydrated || initial || copyFrom) return;
    lastUnitAppliedRef.current = true;
    setForm(f => {
      const unit = pickRememberedUnit({
        isNew: true,
        hydrated: lastUnitHydrated,
        formJson: JSON.stringify(f),
        pristineJson: initialFormRef.current,
        lastUnitType,
      });
      if (!unit) return f;
      const next = { ...f, baseUnitType: unit };
      initialFormRef.current = JSON.stringify(next);
      return next;
    });
  }, [copyFrom, initial, lastUnitHydrated, lastUnitType]);

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

  function applyJettePriceDraft(draft) {
    setForm(f => ({
      ...f,
      productCode: draft.productCode || f.productCode,
      ingredientName: draft.ingredientName || f.ingredientName,
      taxType: draft.taxType || f.taxType,
      temperature: draft.temperature || f.temperature,
      priceOverride: draft.priceOverride !== '' ? draft.priceOverride : f.priceOverride,
    }));
    setErrors(e => {
      const next = { ...e };
      delete next.productCode;
      delete next.ingredientName;
      delete next.priceOverride;
      return next;
    });
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
      setLastUnitType(data.baseUnitType || 'g');
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

        {isJetteLinked && <JetteLinkedSourcePanel ingredient={initial} />}

        <form
          onSubmit={handleSubmit}
          aria-busy={saving}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          {!isJetteLinked && (
            <JettePriceImportField
              priceRows={jettePriceRows}
              form={form}
              existingProductCodes={existingProductCodes}
              onApply={applyJettePriceDraft}
            />
          )}

          <IngredientNameField
            form={form}
            errors={errors}
            isJetteLinked={isJetteLinked}
            initial={initial}
            onSet={set}
          />

          <PhotoSection
            formPhotos={formPhotos}
            photoInputRefs={photoInputRefs}
            onPhotoFile={handlePhotoFile}
            onRemovePhoto={removePhoto}
          />

          <BasicIngredientFields
            form={form}
            errors={errors}
            isJetteLinked={isJetteLinked}
            catOptions={catOptions}
            customCat={customCat}
            tagInput={tagInput}
            datalistId={datalistId}
            onSet={set}
            onToggleCustomCat={() => {
              setCustomCat(v => !v);
              set('category', '');
            }}
            onTagInputChange={setTagInput}
            onAddTag={addTag}
            onRemoveTag={removeTag}
          />

          <IngredientCostFields
            form={form}
            errors={errors}
            isJetteLinked={isJetteLinked}
            onSet={set}
          />

          <OriginSection
            origin={form.origin || []}
            originHidden={form.originHidden}
            originSuggestions={originSuggestions}
            onSet={set}
          />

          <AllergenSection allergens={form.allergens || []} onSet={set} />

          {initial && (
            <IngredientUsageSection
              loading={usageSummary.loading}
              rows={usageSummary.rows}
              error={usageSummary.error}
            />
          )}

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
