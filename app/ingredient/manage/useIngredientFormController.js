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
  pieceWeightGrams: '',
  taxType: '과세',
  priceOverride: '',
  scope: '',
  note: '',
  photo: null,
  photos: normalizeIngredientPhotos(null),
  origin: [],
  originHidden: false,
  originNone: false,
  allergens: [],
  allergenNone: false,
  replacementProductCode: '',
  replacementIngredientName: '',
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
  // saving state는 다음 렌더까지 반영이 늦을 수 있어(Enter 연타·Ctrl+S 겹침) ref로 즉시 막는다.
  const submittingRef = useRef(false);

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

  // 단종 체크를 해제하면 골라뒀던 대체 식자재도 함께 지운다 — 체크 해제 상태로 대체
  // 코드만 남아 있으면 다음에 다시 체크할 때 의도치 않게 재연결될 수 있다.
  function setDiscontinued(value) {
    setForm(f =>
      value === true
        ? { ...f, discontinued: true }
        : { ...f, discontinued: false, replacementProductCode: '', replacementIngredientName: '' }
    );
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
    if (form.baseUnitType === '개' && !parseOptionalNonNegativeNumber(form.pieceWeightGrams).ok) {
      e.pieceWeightGrams = '0 이상의 숫자만 입력하세요';
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
    const replacementCode = (form.replacementProductCode || '').trim();
    if (replacementCode && replacementCode.toUpperCase() === origCode.toUpperCase()) {
      e.replacementProductCode = '같은 제품코드로는 대체할 수 없습니다.';
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
    if (submittingRef.current) return;
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    try {
      const baseQuantity = parseOptionalNonNegativeNumber(form.baseQuantity).value;
      const priceOverride = parseOptionalNonNegativeNumber(form.priceOverride).value;
      const pieceWeightGrams =
        form.baseUnitType === '개'
          ? parseOptionalNonNegativeNumber(form.pieceWeightGrams).value
          : null;
      // normalizeOrigin(lib/ingredient/normalize.js)과 동일하게 country만 있어도 유효한 항목으로
      // 취급한다 — 표시품목명 없이 국가만 입력한 행을 여기서 걸러내면 저장 직후 "미입력"으로
      // 되돌아가고 원산지 미표기 이슈가 다시 뜬다(표시명 없이 "국내산"만 적는 경우가 실제로 있다).
      const origin = (form.origin || [])
        .filter(it => it.country?.trim())
        .map(it => ({ displayName: (it.displayName || '').trim(), country: it.country.trim() }));
      const originValue = origin.length ? origin : null;
      const data = {
        ...form,
        baseQuantity,
        pieceWeightGrams,
        origin: form.originNone === true ? null : originValue,
        originHidden: form.originHidden === true,
        originNone: form.originNone === true,
        allergens: form.allergenNone === true ? [] : form.allergens || [],
        allergenNone: form.allergenNone === true,
      };
      data.photos = normalizeIngredientPhotos(form.photos, form.photo);
      data.photo = getPrimaryIngredientPhoto({ photos: data.photos });
      if (isJetteLinked) {
        delete data.priceOverride;
      } else {
        data.priceOverride = priceOverride;
      }
      const replacementCode = (form.replacementProductCode || '').trim();
      const saveOptions = {
        replacement:
          form.discontinued === true && replacementCode
            ? { productCode: replacementCode, ingredientName: form.replacementIngredientName || '' }
            : null,
      };
      // replacementProductCode/replacementIngredientName은 폼 전용 임시 필드라
      // 식자재 레코드 화이트리스트(buildRecord/upsertIngredientMeta)에 넣지 않는다 —
      // saveOptions로 이미 넘겼으니 data에서는 지운다.
      delete data.replacementProductCode;
      delete data.replacementIngredientName;
      await onSave(data, saveOptions);
      setLastUnitType(data.baseUnitType || 'g');
    } finally {
      setSaving(false);
      submittingRef.current = false;
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
    setDiscontinued,
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
    pieceWeightGrams: r.pieceWeightGrams != null ? String(r.pieceWeightGrams) : '',
    taxType: r.taxType || '과세',
    priceOverride: r.priceOverride != null ? String(r.priceOverride) : '',
    scope: r.scope && r.scope !== SCOPE_UNASSIGNED ? r.scope : '',
    note: r.note || '',
    photos: normalizeIngredientPhotos(r.photos, r.photo),
    photo: getPrimaryIngredientPhoto(r),
    temperature: r.temperature || '',
    origin: toOriginItems(r.origin),
    originHidden: r.originHidden === true,
    originNone: r.originNone === true,
    allergens: Array.isArray(r.allergens) ? r.allergens : [],
    allergenNone: r.allergenNone === true,
    // 대체 식자재는 레코드에 저장되는 값이 아니라 이번 저장 시 실행할 액션이라 항상 빈 값으로 시작
    replacementProductCode: '',
    replacementIngredientName: '',
  };
}

function toOriginItems(v) {
  if (!v) return [];
  if (Array.isArray(v))
    return v.map(it => ({ displayName: it.displayName || '', country: it.country || '' }));
  if (v.country) return [{ displayName: v.displayName || '', country: v.country || '' }];
  return [];
}
