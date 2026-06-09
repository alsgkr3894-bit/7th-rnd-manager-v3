'use client';
import { useRef, useState, useEffect } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { SAMPLE_CATEGORIES, RATING_LABELS, RATING_COLOR, getAllSamples } from '@/lib/sample';
import { initDB } from '@/lib/db';
import { TagInput } from '@/components/ui/TagInput';
import { ComboBox } from '@/components/ui/ComboBox';
import { SegGroup, Field } from '@/components/note/FormFields';
import { isSupportedImageFile, resizePhoto } from '@/lib/image/resize';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import { asDisplayText, asObjectArray, clampInteger } from '@/lib/ui/prop-guards';

export const SAMPLE_INIT = {
  title: '', sampleNames: [''], category: '',
  testDate: '', company: '', tester: '',
  rating: 0, price: '', priceTaxType: 'incl',
  description: '', result: '', improvements: '', nextAction: '', tags: '',
  photos: [],
  linkedProducts: [],  // [{kind:'ingredient'|'menu', code, name}]
};

const MAX_PHOTOS = 8;
const noop = () => {};

export function SampleFormBody({ form, setForm }) {
  const fileInputRef = useRef(null);
  const productSearchTimerRef = useRef(null);
  const [allTags,        setAllTags]        = useState([]);
  const [catOptions,     setCatOptions]     = useState(SAMPLE_CATEGORIES);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]); // [{kind, code, name, label}]
  const [productSearch,  setProductSearch]  = useState('');
  function upd(k, v) { setForm(f => ({ ...f, [k]: v })); }

  // 샘플명(복수) 핸들러
  function setSampleName(i, v) {
    setForm(f => { const a = [...(f.sampleNames || [''])]; a[i] = v; return { ...f, sampleNames: a }; });
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
    initDB().then(() => Promise.all([
      getAllSamples(),
      getAllIngredients(),
      getAllMenuMaster(),
    ])).then(([samples, ings, menus]) => {
      const tags = new Set();
      const cats = new Set(SAMPLE_CATEGORIES);
      const comps = new Set();
      samples.forEach(s => {
        (s.tags || '').split(',').map(t => t.trim()).filter(Boolean).forEach(t => tags.add(t));
        if (s.category) cats.add(s.category);
        if (s.company)  comps.add(s.company);
      });
      setAllTags([...tags]);
      setCatOptions([...cats]);
      setCompanyOptions([...comps]);

      const opts = [
        ...ings
          .filter(i => !i.discontinued && !i.excluded)
          .map(i => ({ kind: 'ingredient', code: i.productCode || String(i.id), name: i.ingredientName || i.displayName })),
        ...menus
          .filter(m => m.status !== 'discontinued')
          .map(m => ({ kind: 'menu', code: m.menuCode, name: m.menuName })),
      ];
      setProductOptions(opts);
    }).catch(() => {});
  }, []);

  useEffect(() => () => {
    if (productSearchTimerRef.current) clearTimeout(productSearchTimerRef.current);
  }, []);

  function clearProductSearchSoon() {
    if (productSearchTimerRef.current) clearTimeout(productSearchTimerRef.current);
    productSearchTimerRef.current = setTimeout(() => {
      setProductSearch('');
      productSearchTimerRef.current = null;
    }, 160);
  }

  async function handleFiles(files) {
    const current = Array.isArray(form.photos) ? form.photos.filter(p => p && typeof p === 'object') : [];
    const slots = MAX_PHOTOS - current.length;
    if (slots <= 0) { showToast(`사진은 최대 ${MAX_PHOTOS}장까지만 등록할 수 있어요`, 'warn'); return; }
    const allFiles = files ? Array.from(files) : [];
    const imageFiles = allFiles.filter(isSupportedImageFile);
    const rejected = allFiles.length - imageFiles.length;
    if (rejected > 0) showToast('지원하지 않는 이미지 파일은 제외했어요', 'warn');

    const candidates = imageFiles.slice(0, slots);
    if (candidates.length === 0) return;
    const toAdd = [];
    for (const file of candidates) {
      if (file.size > 5 * 1024 * 1024) { showToast('파일 크기 초과: ' + file.name + ' (최대 5MB)', 'warn'); continue; }
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
    const current = Array.isArray(form.photos) ? form.photos.filter(p => p && typeof p === 'object') : [];
    upd('photos', current.filter((_, idx) => idx !== i));
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  const photos = Array.isArray(form.photos) ? form.photos.filter(p => p && typeof p === 'object') : [];

  return (
    <div className="form-layout" style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:24, marginTop:24, alignItems:'start' }}>

      {/* ── 좌측 폼 ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* 기본 정보 */}
        <div className="card">
          <div className="card-title" style={{ marginBottom:16 }}>기본 정보</div>

          <Field label="제목" required>
            <input className="form-input" value={form.title}
              onChange={e => upd('title', e.target.value)}
              placeholder="예) 불고기 피자 3차 샘플 — 소스 비율 조정"/>
          </Field>

          {/* 샘플명 (복수) */}
          <Field label="샘플명" required hint="여러 개 추가 가능">
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {(form.sampleNames || ['']).map((name, i) => (
                <div key={i} style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <input className="form-input" value={name}
                    onChange={e => setSampleName(i, e.target.value)}
                    placeholder="예) 불고기피자"/>
                  {(form.sampleNames || ['']).length > 1 && (
                    <button type="button" className="btn" style={{ padding:'6px 8px', flexShrink:0 }}
                      onClick={() => removeSampleName(i)} aria-label={`샘플명 ${i + 1} 삭제`}>
                      <Icon.close style={{ width:12, height:12 }}/>
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn sm" style={{ alignSelf:'flex-start' }} onClick={addSampleName}>
                <Icon.plus style={{ width:12, height:12 }}/> 샘플명 추가
              </button>
            </div>
          </Field>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="샘플수령날짜">
              <input className="form-input" type="date" value={form.testDate}
                onChange={e => upd('testDate', e.target.value)}/>
            </Field>
            <Field label="카테고리" hint="입력·선택 모두 가능">
              <ComboBox value={form.category} onChange={v => upd('category', v)}
                options={catOptions} placeholder="예) 피자" inputClassName="form-input"/>
            </Field>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="업체명">
              <ComboBox value={form.company} onChange={v => upd('company', v)}
                options={companyOptions} placeholder="예) 대림수산" inputClassName="form-input"/>
            </Field>
            <Field label="담당자">
              <input className="form-input" value={form.tester}
                onChange={e => upd('tester', e.target.value)}
                placeholder="예) 김민지"/>
            </Field>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="평점">
              <StarPicker value={form.rating} onChange={v => upd('rating', v)}/>
            </Field>
            <Field label="단가">
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <input className="form-input" type="number" min="0" value={form.price}
                    onChange={e => upd('price', e.target.value)} placeholder="예) 12000"/>
                  <span style={{ fontSize:13, color:'var(--text-3)', flexShrink:0 }}>원</span>
                </div>
                <SegGroup options={['부가세포함', '별도']}
                  value={form.priceTaxType === 'excl' ? '별도' : '부가세포함'}
                  onChange={v => upd('priceTaxType', v === '별도' ? 'excl' : 'incl')}/>
              </div>
            </Field>
          </div>
        </div>

        {/* 상세 기록 */}
        <div className="card">
          <div className="card-title" style={{ marginBottom:16 }}>
            상세 기록 <span style={{ fontSize:12, fontWeight:400, color:'var(--text-3)' }}>선택</span>
          </div>

          <Field label="테스트 내용 / 조건">
            <textarea className="form-input" style={{ minHeight:96, resize:'vertical' }}
              value={form.description}
              onChange={e => upd('description', e.target.value)}
              placeholder="재료 비율, 조리 시간, 온도, 변경 사항 등"/>
          </Field>

          <Field label="평가 / 결과">
            <textarea className="form-input" style={{ minHeight:80, resize:'vertical' }}
              value={form.result}
              onChange={e => upd('result', e.target.value)}
              placeholder="맛, 식감, 외관, 고객 반응 등"/>
          </Field>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="개선사항">
              <textarea className="form-input" style={{ minHeight:72, resize:'vertical' }}
                value={form.improvements}
                onChange={e => upd('improvements', e.target.value)}
                placeholder="보완할 부분"/>
            </Field>
            <Field label="다음 액션">
              <textarea className="form-input" style={{ minHeight:72, resize:'vertical' }}
                value={form.nextAction}
                onChange={e => upd('nextAction', e.target.value)}
                placeholder="재테스트 방향, 일정 등"/>
            </Field>
          </div>

          <Field label="태그" hint="입력 후 Enter 또는 콤마">
            <TagInput value={form.tags} onChange={v => upd('tags', v)} suggestions={allTags}/>
          </Field>
        </div>
      </div>

      {/* ── 우측: 연결 제품 + 사진 ── */}
      <div className="form-sticky-right" style={{ position:'sticky', top:80 }}>
        {/* 연결 제품 카드 */}
        <LinkedProductsCard
          linked={form.linkedProducts || []}
          options={productOptions}
          search={productSearch}
          onSearchChange={setProductSearch}
          onBlurSearch={clearProductSearchSoon}
          onAdd={item => {
            const already = (form.linkedProducts || []).some(p => p.kind === item.kind && p.code === item.code);
            if (!already) upd('linkedProducts', [...(form.linkedProducts || []), item]);
            setProductSearch('');
          }}
          onRemove={idx => upd('linkedProducts', (form.linkedProducts || []).filter((_, i) => i !== idx))}
        />

        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="card-title">사진</div>
            <span style={{ fontSize:12, color:'var(--text-3)' }}>{photos.length} / {MAX_PHOTOS}</span>
          </div>

          {/* 드래그앤드롭 영역 */}
          {photos.length < MAX_PHOTOS && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border:'2px dashed var(--border)', borderRadius:12,
                padding:'24px 16px', textAlign:'center', cursor:'pointer',
                color:'var(--text-3)', marginBottom:12, transition:'border-color 160ms',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
            >
              <div style={{ fontSize:28, marginBottom:6 }}>📷</div>
              <div style={{ fontSize:13, fontWeight:600 }}>클릭하거나 사진을 끌어다 놓으세요</div>
              <div style={{ fontSize:11, marginTop:4 }}>JPG · PNG · HEIC · 최대 {MAX_PHOTOS}장</div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display:'none' }}
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
          />

          {/* 사진 그리드 */}
          {photos.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ borderRadius:8, overflow:'visible', background:'transparent' }}>
                  <div style={{ position:'relative', aspectRatio:'4/3', borderRadius:8, overflow:'hidden', background:'var(--surface-2)' }}>
                    <img src={p.data} alt={p.name}
                      style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    <button
                      onClick={() => removePhoto(i)}
                      style={{
                        position:'absolute', top:4, right:4,
                        background:'rgba(0,0,0,0.55)', border:'none', borderRadius:'50%',
                        width:22, height:22, cursor:'pointer', display:'flex',
                        alignItems:'center', justifyContent:'center', padding:0,
                      }}
                    >
                      <Icon.close style={{ width:11, height:11, color:'#fff' }}/>
                    </button>
                    {i === 0 && (
                      <span style={{
                        position:'absolute', bottom:4, left:4,
                        background:'rgba(0,0,0,0.5)', color:'#fff',
                        fontSize:9, padding:'1px 5px', borderRadius:4, fontWeight:700,
                      }}>대표</span>
                    )}
                  </div>
                  {/* 사진 캡션 */}
                  <input
                    className="form-input"
                    style={{ marginTop:4, fontSize:11, padding:'4px 8px' }}
                    value={p.caption || ''}
                    onChange={e => {
                      const updated = [...photos];
                      updated[i] = { ...updated[i], caption: e.target.value };
                      upd('photos', updated);
                    }}
                    placeholder="캡션 (선택)"
                  />
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    aspectRatio:'4/3', border:'1px dashed var(--border)',
                    borderRadius:8, background:'var(--surface-2)', cursor:'pointer',
                    display:'flex', flexDirection:'column', alignItems:'center',
                    justifyContent:'center', gap:4, color:'var(--text-3)',
                  }}
                >
                  <Icon.plus style={{ width:18, height:18 }}/>
                  <span style={{ fontSize:11 }}>추가</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const rating = clampInteger(value, { min: 0, max: 5, fallback: 0 });
  const change = typeof onChange === 'function' ? onChange : noop;

  function handleClick(e, n) {
    const btn = e.currentTarget;
    btn.classList.remove('star-pop');
    void btn.offsetWidth;
    btn.classList.add('star-pop');
    change(rating === n ? 0 : n);
  }
  const lit = hovered > 0 ? hovered : rating;
  return (
    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          className={'star-rate-btn' + (n <= lit ? ' lit' : '')}
          style={{ fontSize:22 }}
          onClick={e => handleClick(e, n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
        >★</button>
      ))}
      {rating > 0 && (
        <span style={{ marginLeft:6, fontSize:12, color: RATING_COLOR[rating] || 'var(--text-2)', fontWeight:600 }}>
          {RATING_LABELS[rating]}
        </span>
      )}
    </div>
  );
}

/** 샘플기록 — 식자재·메뉴 제품 연결 카드 */
function LinkedProductsCard({ linked, options, search, onSearchChange, onBlurSearch, onAdd, onRemove }) {
  const linkedItems = Array.isArray(linked)
    ? linked
        .map((item, sourceIndex) => ({ item, sourceIndex }))
        .filter(({ item }) => item && typeof item === 'object' && !Array.isArray(item))
    : [];
  const safeOptions = asObjectArray(options);
  const safeSearch = asDisplayText(search);
  const updateSearch = typeof onSearchChange === 'function' ? onSearchChange : noop;
  const blurSearch = typeof onBlurSearch === 'function' ? onBlurSearch : noop;
  const add = typeof onAdd === 'function' ? onAdd : noop;
  const remove = typeof onRemove === 'function' ? onRemove : noop;
  const query = safeSearch.trim().toLowerCase();
  const filtered = query
    ? safeOptions.filter(o =>
        asDisplayText(o.name).toLowerCase().includes(query) ||
        asDisplayText(o.code).toLowerCase().includes(query))
      .slice(0, 12)
    : [];

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="card-title" style={{ marginBottom: 10 }}>연결 제품</div>

      {/* 검색 */}
      <div style={{ position: 'relative' }}>
        <input className="form-input" value={safeSearch} placeholder="식자재명 또는 메뉴명 검색"
          onChange={e => updateSearch(e.target.value)}
          onBlur={blurSearch}/>
        {filtered.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 200,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,.12)', maxHeight: 200, overflowY: 'auto',
          }}>
            {filtered.map((o, i) => {
              const kind = asDisplayText(o.kind);
              const code = asDisplayText(o.code);
              const name = asDisplayText(o.name, '이름 없음');

              return (
                <div
                  key={`${kind || 'item'}-${code || name}-${i}`}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}
                  onMouseDown={e => { e.preventDefault(); add(o); }}
                >
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                    background: kind === 'ingredient' ? 'var(--positive-soft)' : 'var(--accent-soft)',
                    color: kind === 'ingredient' ? 'var(--positive)' : 'var(--accent-text)',
                  }}>
                    {kind === 'ingredient' ? '식자재' : '메뉴'}
                  </span>
                  {name}
                  {code && <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 'auto' }}>{code}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 연결된 제품 칩 */}
      {linkedItems.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {linkedItems.map(({ item: p, sourceIndex }, i) => {
            const kind = asDisplayText(p.kind);
            const name = asDisplayText(p.name, '이름 없음');

            return (
              <span key={`${kind || 'item'}-${asDisplayText(p.code) || name}-${i}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: kind === 'ingredient' ? 'var(--positive-soft)' : 'var(--accent-soft)',
                color: kind === 'ingredient' ? 'var(--positive)' : 'var(--accent-text)',
              }}>
                {name}
                <button type="button" onClick={() => remove(sourceIndex)}
                  style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit', opacity: .6 }}>
                  <Icon.close style={{ width: 11, height: 11 }}/>
                </button>
              </span>
            );
          })}
        </div>
      )}
      {linkedItems.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 8 }}>연결된 제품 없음</div>
      )}
    </div>
  );
}
