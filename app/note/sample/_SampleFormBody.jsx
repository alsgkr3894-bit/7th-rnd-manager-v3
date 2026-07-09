'use client';
import { useRef, useState, useEffect } from 'react';
import { showToast } from '@/components/Toast';
import {
  SAMPLE_CATEGORIES,
  SAMPLE_RECORD_TYPES,
  getAllSamples,
  sampleIngredientGroupName,
} from '@/lib/sample';
import { initDB } from '@/lib/db';
import { isSupportedImageFile, resizePhoto } from '@/lib/image/resize';
import { clipboardImageFiles } from '@/lib/image/clipboard';
import { UPLOAD_MAX_MB, checkFileSize } from '@/lib/upload-policy';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import { SampleBasicInfoCard } from './_SampleBasicInfoCard';
import { SampleDetailRecordCard } from './_SampleDetailRecordCard';
import { SampleLinkedProductsCard } from './_SampleLinkedProductsCard';
import { SamplePhotoCard } from './_SamplePhotoCard';

export const SAMPLE_INIT = {
  title: '',
  recordType: SAMPLE_RECORD_TYPES.SAMPLE_TEST,
  ingredientGroupName: '',
  ingredientGroupCode: '',
  ingredientId: null,
  sampleNames: [''],
  category: '',
  testDate: '',
  testRound: '',
  company: '',
  tester: '',
  rating: 0,
  price: '',
  priceTaxType: 'incl',
  description: '',
  result: '',
  improvements: '',
  nextAction: '',
  tags: '',
  photos: [],
  parentId: null,
  linkedProducts: [], // [{kind:'ingredient'|'menu', code, name}]
  linkedNoteId: null,
};

const MAX_PHOTOS = 8;

export function SampleFormBody({ form, setForm, readOnly = false }) {
  const fileInputRef = useRef(null);
  const productSearchTimerRef = useRef(null);
  const formPhotosRef = useRef([]);
  const [allTags, setAllTags] = useState([]);
  const [catOptions, setCatOptions] = useState(SAMPLE_CATEGORIES);
  const [ingredientGroupOptions, setIngredientGroupOptions] = useState([]);
  const [ingredientLookup, setIngredientLookup] = useState(new Map());
  const [companyOptions, setCompanyOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]); // [{kind, code, name, label}]
  const [productSearch, setProductSearch] = useState('');
  function upd(k, v) {
    if (readOnly) return;
    setForm(f => ({ ...f, [k]: v }));
  }

  // 샘플명(복수) 핸들러
  function setSampleName(i, v) {
    if (readOnly) return;
    setForm(f => {
      const a = [...(f.sampleNames || [''])];
      a[i] = v;
      return { ...f, sampleNames: a };
    });
  }
  function addSampleName() {
    if (readOnly) return;
    setForm(f => ({ ...f, sampleNames: [...(f.sampleNames || ['']), ''] }));
  }
  function removeSampleName(i) {
    if (readOnly) return;
    setForm(f => {
      const a = (f.sampleNames || ['']).filter((_, idx) => idx !== i);
      return { ...f, sampleNames: a.length ? a : [''] };
    });
  }

  useEffect(() => {
    let alive = true;
    initDB()
      .then(() => Promise.all([getAllSamples(), getAllIngredients(), getAllMenuMaster()]))
      .then(([samples, ings, menus]) => {
        if (!alive) return;
        const tags = new Set();
        const cats = new Set(SAMPLE_CATEGORIES);
        const comps = new Set();
        const groupNames = new Set();
        const groupLookup = new Map();
        const normalizeGroupKey = value =>
          String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '');
        samples.forEach(s => {
          (s.tags || '')
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)
            .forEach(t => tags.add(t));
          if (s.category) cats.add(s.category);
          if (s.company) comps.add(s.company);
          const groupName = sampleIngredientGroupName(s);
          if (groupName) groupNames.add(groupName);
        });
        ings
          .filter(i => !i.discontinued && !i.excluded)
          .forEach(i => {
            const name = i.ingredientName || i.displayName || i.productName || i.productCode;
            if (!name) return;
            groupNames.add(name);
            groupLookup.set(normalizeGroupKey(name), {
              id: i.id,
              code: i.productCode || String(i.id || ''),
              name,
            });
          });
        setAllTags([...tags]);
        setCatOptions([...cats]);
        setIngredientGroupOptions([...groupNames].sort((a, b) => a.localeCompare(b, 'ko')));
        setIngredientLookup(groupLookup);
        setCompanyOptions([...comps]);

        const opts = [
          ...ings
            .filter(i => !i.discontinued && !i.excluded)
            .map(i => ({
              kind: 'ingredient',
              code: i.productCode || String(i.id),
              name: i.ingredientName || i.displayName,
            })),
          ...menus
            .filter(m => m.status !== 'discontinued')
            .map(m => ({ kind: 'menu', code: m.menuCode, name: m.menuName })),
        ];
        setProductOptions(opts);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (productSearchTimerRef.current) clearTimeout(productSearchTimerRef.current);
    },
    []
  );

  function clearProductSearchSoon() {
    if (productSearchTimerRef.current) clearTimeout(productSearchTimerRef.current);
    productSearchTimerRef.current = setTimeout(() => {
      setProductSearch('');
      productSearchTimerRef.current = null;
    }, 160);
  }

  // 비동기 리사이즈 완료 시점의 최신 form.photos를 읽어 연속 붙여넣기 스냅샷 경쟁을 완화한다.
  formPhotosRef.current = Array.isArray(form.photos)
    ? form.photos.filter(p => p && typeof p === 'object')
    : [];

  async function handleFiles(files) {
    if (readOnly) return;
    const current = formPhotosRef.current;
    const slots = MAX_PHOTOS - current.length;
    if (slots <= 0) {
      showToast(`사진은 최대 ${MAX_PHOTOS}장까지만 등록할 수 있어요`, 'warn');
      return;
    }
    const allFiles = files ? Array.from(files) : [];
    const imageFiles = allFiles.filter(isSupportedImageFile);
    const rejected = allFiles.length - imageFiles.length;
    if (rejected > 0) showToast('지원하지 않는 이미지 파일은 제외했어요', 'warn');

    const candidates = imageFiles.slice(0, slots);
    if (candidates.length === 0) return;
    const toAdd = [];
    for (const file of candidates) {
      const sizeErr = checkFileSize(file, UPLOAD_MAX_MB.photo);
      if (sizeErr) {
        showToast(sizeErr, 'warn');
        continue;
      }
      toAdd.push(file);
    }
    const settled = await Promise.allSettled(toAdd.map(resizePhoto));
    const resized = [];
    const failed = [];
    settled.forEach((res, i) => {
      if (res.status === 'fulfilled') resized.push(res.value);
      else failed.push(toAdd[i].name);
    });
    if (resized.length) upd('photos', [...formPhotosRef.current, ...resized]);
    if (failed.length) showToast(`사진 처리 실패: ${failed.join(', ')}`, 'warn');
  }

  function removePhoto(i) {
    if (readOnly) return;
    const current = Array.isArray(form.photos)
      ? form.photos.filter(p => p && typeof p === 'object')
      : [];
    upd(
      'photos',
      current.filter((_, idx) => idx !== i)
    );
  }

  function handleDrop(e) {
    e.preventDefault();
    if (readOnly) return;
    handleFiles(e.dataTransfer.files);
  }

  function handlePaste(event) {
    if (readOnly) return;
    const pastedFiles = clipboardImageFiles(event.clipboardData, {
      namePrefix: 'pasted-sample-photo',
    });
    if (pastedFiles.length === 0) return;
    event.preventDefault();
    handleFiles(pastedFiles);
  }

  useEffect(() => {
    if (readOnly) return undefined;
    function handleDocumentPaste(event) {
      if (event.defaultPrevented) return;
      handlePaste(event);
    }
    document.addEventListener('paste', handleDocumentPaste);
    return () => document.removeEventListener('paste', handleDocumentPaste);
  });

  const photos = Array.isArray(form.photos)
    ? form.photos.filter(p => p && typeof p === 'object')
    : [];

  function updateIngredientGroup(value) {
    if (readOnly) return;
    const name = String(value || '').trim();
    const key = name.toLowerCase().replace(/\s+/g, '');
    const matched = ingredientLookup.get(key);
    setForm(f => {
      const linkedProducts = Array.isArray(f.linkedProducts) ? f.linkedProducts : [];
      const next = {
        ...f,
        ingredientGroupName: name,
        ingredientGroupCode: matched?.code || '',
        ingredientId: matched?.id || null,
      };
      if (!matched) return next;
      const already = linkedProducts.some(
        item => item.kind === 'ingredient' && item.code === matched.code
      );
      return already
        ? next
        : {
            ...next,
            linkedProducts: [
              ...linkedProducts,
              { kind: 'ingredient', code: matched.code, name: matched.name },
            ],
          };
    });
  }

  return (
    <div
      className="form-layout"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, 420px)',
        gap: 24,
        marginTop: 24,
        alignItems: 'start',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SampleBasicInfoCard
          form={form}
          catOptions={catOptions}
          companyOptions={companyOptions}
          onUpdate={upd}
          onSampleName={setSampleName}
          onAddSampleName={addSampleName}
          onRemoveSampleName={removeSampleName}
          ingredientGroupOptions={ingredientGroupOptions}
          onIngredientGroup={updateIngredientGroup}
          readOnly={readOnly}
        />
        <SampleDetailRecordCard form={form} allTags={allTags} onUpdate={upd} readOnly={readOnly} />
      </div>

      <div className="form-sticky-right" style={{ position: 'sticky', top: 80 }}>
        <SampleLinkedProductsCard
          linked={form.linkedProducts || []}
          options={productOptions}
          search={productSearch}
          onSearchChange={setProductSearch}
          onBlurSearch={clearProductSearchSoon}
          onAdd={item => {
            if (readOnly) return;
            const already = (form.linkedProducts || []).some(
              p => p.kind === item.kind && p.code === item.code
            );
            if (!already) upd('linkedProducts', [...(form.linkedProducts || []), item]);
            setProductSearch('');
          }}
          onRemove={idx =>
            upd(
              'linkedProducts',
              (form.linkedProducts || []).filter((_, i) => i !== idx)
            )
          }
          readOnly={readOnly}
        />

        <SamplePhotoCard
          photos={photos}
          maxPhotos={MAX_PHOTOS}
          fileInputRef={fileInputRef}
          onDrop={handleDrop}
          onPaste={handlePaste}
          onFiles={handleFiles}
          onRemovePhoto={removePhoto}
          maxPhotoMb={UPLOAD_MAX_MB.photo}
          onCaptionChange={(index, caption) => {
            if (readOnly) return;
            const updated = [...photos];
            updated[index] = { ...updated[index], caption };
            upd('photos', updated);
          }}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
