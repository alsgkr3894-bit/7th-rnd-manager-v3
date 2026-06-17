'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { useLocalStorage } from '@/hooks/useLocalStorage';
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
import { normalizeCostBaseUnit } from '@/lib/cost/unit-policy';
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
  origin: [],
  originHidden: false,
  allergens: [],
};

export function useIngredientFormController({
  initial,
  copyFrom,
  existingProductCodes,
  onSave,
  onClose,
  extraCategories,
}) {
  const isJetteLinked = !!initial?.jetteLinked;
  const catOptions = sortMainCategories([
    ...new Set([...SEED_MAIN_CATEGORIES, ...(extraCategories || [])].filter(Boolean)),
  ]);

  const [lastUnitType, setLastUnitType, lastUnitHydrated] = useLocalStorage(
    KEYS.INGREDIENT_LAST_UNIT_TYPE,
    'g',
    normalizeUnitType
  );

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
  const datalistId = useId();

  const initialFormRef = useRef(JSON.stringify(buildInitialForm()));
  const isDirty = JSON.stringify(form) !== initialFormRef.current;
  useBeforeUnload(isDirty);

  // 마지막 사용 단위 복원: 새 폼이 아직 손대지 않은 상태일 때만 1회 적용
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
    const newCode = (form.productCode || '').trim();
    const origCode = (initial?.productCode || '').trim();
    if (
      newCode &&
      newCode.toUpperCase() !== origCode.toUpperCase() &&
      (existingProductCodes || []).some(c => c.toUpperCase() === newCode.toUpperCase())
    ) {
      e.productCode = `이미 등록된 제품코드입니다: ${newCode}`;
    }
    return e;
  }

  useKeyboardSave(() => handleSubmit({ preventDefault() {} }));

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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

  return {
    form,
    tagInput,
    setTagInput,
    customCat,
    setCustomCat,
    saving,
    errors,
    isDirty,
    datalistId,
    isJetteLinked,
    catOptions,
    isNew,
    title,
    formPhotos,
    set,
    addTag,
    removeTag,
    applyJettePriceDraft,
    handleSubmit,
    handlePhotoFile,
    removePhoto,
  };
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

function toOriginItems(v) {
  if (!v) return [];
  if (Array.isArray(v))
    return v.map(it => ({ displayName: it.displayName || '', country: it.country || '' }));
  if (v.country) return [{ displayName: v.displayName || '', country: v.country || '' }];
  return [];
}
