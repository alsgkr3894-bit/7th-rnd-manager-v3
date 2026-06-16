'use client';
import { useRef, useState, useEffect } from 'react';
import { showToast } from '@/components/Toast';
import { SAMPLE_CATEGORIES, getAllSamples } from '@/lib/sample';
import { initDB } from '@/lib/db';
import { isSupportedImageFile, resizePhoto } from '@/lib/image/resize';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import { SampleBasicInfoCard } from './_SampleBasicInfoCard';
import { SampleDetailRecordCard } from './_SampleDetailRecordCard';
import { SampleLinkedProductsCard } from './_SampleLinkedProductsCard';
import { SamplePhotoCard } from './_SamplePhotoCard';

export const SAMPLE_INIT = {
  title: '',
  sampleNames: [''],
  category: '',
  testDate: '',
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
  linkedProducts: [], // [{kind:'ingredient'|'menu', code, name}]
  linkedNoteId: null,
};

const MAX_PHOTOS = 8;

export function SampleFormBody({ form, setForm }) {
  const fileInputRef = useRef(null);
  const productSearchTimerRef = useRef(null);
  const [allTags, setAllTags] = useState([]);
  const [catOptions, setCatOptions] = useState(SAMPLE_CATEGORIES);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]); // [{kind, code, name, label}]
  const [productSearch, setProductSearch] = useState('');
  function upd(k, v) {
    setForm(f => ({ ...f, [k]: v }));
  }

  // 샘플명(복수) 핸들러
  function setSampleName(i, v) {
    setForm(f => {
      const a = [...(f.sampleNames || [''])];
      a[i] = v;
      return { ...f, sampleNames: a };
    });
  }
  function addSampleName() {
    setForm(f => ({ ...f, sampleNames: [...(f.sampleNames || ['']), ''] }));
  }
  function removeSampleName(i) {
    setForm(f => {
      const a = (f.sampleNames || ['']).filter((_, idx) => idx !== i);
      return { ...f, sampleNames: a.length ? a : [''] };
    });
  }

  useEffect(() => {
    initDB()
      .then(() => Promise.all([getAllSamples(), getAllIngredients(), getAllMenuMaster()]))
      .then(([samples, ings, menus]) => {
        const tags = new Set();
        const cats = new Set(SAMPLE_CATEGORIES);
        const comps = new Set();
        samples.forEach(s => {
          (s.tags || '')
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)
            .forEach(t => tags.add(t));
          if (s.category) cats.add(s.category);
          if (s.company) comps.add(s.company);
        });
        setAllTags([...tags]);
        setCatOptions([...cats]);
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

  async function handleFiles(files) {
    const current = Array.isArray(form.photos)
      ? form.photos.filter(p => p && typeof p === 'object')
      : [];
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
      if (file.size > 5 * 1024 * 1024) {
        showToast('파일 크기 초과: ' + file.name + ' (최대 5MB)', 'warn');
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
    if (resized.length) upd('photos', [...current, ...resized]);
    if (failed.length) showToast(`사진 처리 실패: ${failed.join(', ')}`, 'warn');
  }

  function removePhoto(i) {
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
    handleFiles(e.dataTransfer.files);
  }

  const photos = Array.isArray(form.photos)
    ? form.photos.filter(p => p && typeof p === 'object')
    : [];

  return (
    <div
      className="form-layout"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
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
        />
        <SampleDetailRecordCard form={form} allTags={allTags} onUpdate={upd} />
      </div>

      <div className="form-sticky-right" style={{ position: 'sticky', top: 80 }}>
        <SampleLinkedProductsCard
          linked={form.linkedProducts || []}
          options={productOptions}
          search={productSearch}
          onSearchChange={setProductSearch}
          onBlurSearch={clearProductSearchSoon}
          onAdd={item => {
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
        />

        <SamplePhotoCard
          photos={photos}
          maxPhotos={MAX_PHOTOS}
          fileInputRef={fileInputRef}
          onDrop={handleDrop}
          onFiles={handleFiles}
          onRemovePhoto={removePhoto}
          onCaptionChange={(index, caption) => {
            const updated = [...photos];
            updated[index] = { ...updated[index], caption };
            upd('photos', updated);
          }}
        />
      </div>
    </div>
  );
}
