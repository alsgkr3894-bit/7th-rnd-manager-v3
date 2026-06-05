'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { CATEGORIES, NOTE_TYPES, STATUSES, STATUS_COLORS, NOTE_BRANDS, getAllNotes } from '@/lib/note';
import { getActiveBrandId } from '@/lib/active-brand';
import { TagInput } from '@/components/ui/TagInput';
import { SegGroup, Field } from '@/components/note/FormFields';
import { generateNoteReportText } from '@/lib/note/report';
import { resizePhoto } from '@/lib/image/resize';
import { calcUnitPrice } from '@/lib/cost/calc-unit-price';
import { calcCostRate } from '@/lib/cost/rate-color';
import { KEYS } from '@/lib/note/keys';
import { makeFieldUpdater } from '@/lib/ui/form-state';

// SSR 안전 초기값 — brand와 category는 SSR에서 항상 기본값으로 두고
// 마운트 후 실제 브랜드/저장값으로 교정한다(hydration 불일치 방지).
export const INIT = {
  brand: 'main',
  title: '',
  menuName: '',
  category: CATEGORIES[0],
  noteType: NOTE_TYPES[0],
  status: STATUSES[0],
  testContent: '',
  testDate: '',
  materials: '',
  tasteEval: '',
  managerEval: '',
  costNote: '',
  improvements: '',
  nextAction: '',
  reportSummary: '',
  tags: '',
  tempCostCalc: null,
  photos: [],
};

const MAX_NOTE_PHOTOS = 8;

export function NoteFormBody({ form, setForm }) {
  const updateField = makeFieldUpdater(setForm);
  const [allTags, setAllTags] = useState([]);
  const [touched, setTouched] = useState({});
  function markTouched(k) {
    setTouched(t => ({ ...t, [k]: true }));
  }
  useEffect(() => {
    initDB()
      .then(() => getAllNotes())
      .then(notes => {
        const set = new Set();
        notes.forEach(n =>
          (n.tags || '')
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)
            .forEach(t => set.add(t))
        );
        setAllTags([...set]);
      })
      .catch(err => console.warn('[NoteFormBody]', err));
  }, []);

  const reportText = useMemo(() => generateNoteReportText(form), [form]);

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(reportText);
      showToast('보고용 요약이 복사됐어요', 'ok');
    } catch {
      showToast('복사 실패 (보안 컨텍스트 필요)', 'warn');
    }
  }

  // ── 임시 원가 계산 상태 ──
  const parsedCostCalc = useMemo(() => {
    try {
      if (!form.tempCostCalc) return { rows: [], sellingPrice: '' };
      const p =
        typeof form.tempCostCalc === 'string' ? JSON.parse(form.tempCostCalc) : form.tempCostCalc;
      return { rows: p?.rows || [], sellingPrice: p?.sellingPrice || '' };
    } catch {
      return { rows: [], sellingPrice: '' };
    }
  }, [form.tempCostCalc]);

  function updCost(rows, sellingPrice) {
    updateField('tempCostCalc', JSON.stringify({ rows, sellingPrice }));
  }

  // 원가계산 숫자 입력에서 음수 차단 (라이브 미리보기·저장값 보호)
  function nonNeg(value) {
    return Number(value) < 0 ? '' : value;
  }

  const [ingredients, setIngredients] = useState([]);
  const [ingSearch, setIngSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    initDB()
      .then(() => getAllIngredients())
      .then(list => setIngredients(list.filter(i => !i.excluded && !i.discontinued)))
      .catch(err => console.warn('[NoteFormBody]', err));
  }, []);

  const filteredIngs = useMemo(() => {
    if (!ingSearch.trim()) return [];
    const q = ingSearch.toLowerCase().replace(/\s/g, '');
    return ingredients
      .filter(i => {
        const name = (i.ingredientName || i.productName || '').toLowerCase().replace(/\s/g, '');
        return name.includes(q);
      })
      .slice(0, 8);
  }, [ingSearch, ingredients]);

  function addIngRow(ing) {
    const baseQty = ing.baseQuantity;
    const price = ing.priceOverride ?? ing.price ?? null;
    const up = calcUnitPrice(price, baseQty);
    const unitPrice = up != null ? String(up) : price ? String(Math.round(price)) : '';
    const newRow = {
      id: Date.now(),
      name: ing.ingredientName || ing.productName || '',
      unit: ing.baseUnitType || 'g',
      quantity: '',
      unitPrice,
    };
    updCost([...parsedCostCalc.rows, newRow], parsedCostCalc.sellingPrice);
    setIngSearch('');
    setShowDropdown(false);
  }

  function removeIngRow(rowId) {
    updCost(
      parsedCostCalc.rows.filter(r => r.id !== rowId),
      parsedCostCalc.sellingPrice
    );
  }

  function updateIngRow(rowId, field, value) {
    updCost(
      parsedCostCalc.rows.map(r => (r.id === rowId ? { ...r, [field]: value } : r)),
      parsedCostCalc.sellingPrice
    );
  }

  const totalCost = parsedCostCalc.rows.reduce((sum, r) => {
    return sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0);
  }, 0);
  const sellNum = Number(parsedCostCalc.sellingPrice) || 0;
  const costRate = calcCostRate(totalCost, sellNum);

  return (
    <div
      className="form-layout"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) min(360px, 100%)',
        gap: 24,
        marginTop: 24,
        alignItems: 'start',
      }}
    >
      {/* ── 좌측: 폼 카드들 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 필수 항목 */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>
            필수 항목
          </div>

          <Field label="제목" required error={touched.title && !form.title.trim()}>
            <input
              className="form-input"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              onBlur={() => markTouched('title')}
              placeholder="예) 횡성한우 와사비마요 조합 테스트"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field
              label={form.noteType === '샘플' ? '샘플명 / 메뉴명' : '메뉴명'}
              required
              error={touched.menuName && !form.menuName.trim()}
            >
              <input
                className="form-input"
                value={form.menuName}
                onChange={e => updateField('menuName', e.target.value)}
                onBlur={() => markTouched('menuName')}
                placeholder={
                  form.noteType === '샘플' ? '예) 와규 패티 / 빅맥형 신메뉴' : '예) 횡성한우쉬림프'
                }
              />
            </Field>
            <Field label="테스트 날짜">
              <input
                className="form-input"
                type="date"
                value={form.testDate}
                onChange={e => updateField('testDate', e.target.value)}
              />
            </Field>
          </div>

          <Field label="브랜드" hint="이 노트가 속한 브랜드">
            <SegGroup
              options={NOTE_BRANDS.map(b => b.name)}
              value={(NOTE_BRANDS.find(b => b.id === form.brand) || NOTE_BRANDS[0]).name}
              onChange={name => {
                const found = NOTE_BRANDS.find(b => b.name === name);
                updateField('brand', found ? found.id : 'main');
              }}
            />
          </Field>

          <Field label="개발 구분">
            <SegGroup
              options={CATEGORIES}
              value={form.category}
              onChange={v => {
                updateField('category', v);
                try {
                  localStorage.setItem(KEYS.NOTE_LAST_CATEGORY, v);
                } catch {}
              }}
            />
          </Field>

          <Field label="유형">
            <SegGroup
              options={NOTE_TYPES}
              value={form.noteType}
              onChange={v => updateField('noteType', v)}
            />
          </Field>

          <Field label="상태">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUSES.map(st => {
                const sc = STATUS_COLORS[st];
                const active = form.status === st;
                return (
                  <button
                    key={st}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: '1px solid',
                      borderColor: active ? sc.color : 'var(--border)',
                      background: active ? sc.bg : 'var(--surface)',
                      color: active ? sc.color : 'var(--text-3)',
                      fontFamily: 'inherit',
                      fontSize: 12,
                      fontWeight: active ? 700 : 400,
                      cursor: 'pointer',
                    }}
                    onClick={() => updateField('status', st)}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field
            label="핵심 테스트 내용"
            required
            error={touched.testContent && !form.testContent.trim()}
          >
            <textarea
              className="form-input"
              style={{ minHeight: 100, resize: 'vertical' }}
              value={form.testContent}
              onChange={e => updateField('testContent', e.target.value)}
              onBlur={() => markTouched('testContent')}
              placeholder="테스트 조건, 온도·시간·재료 비율, 핵심 변경사항 등을 기록하세요."
            />
            {form.testContent && (
              <div className={`char-count${form.testContent.length > 500 ? ' warn' : ''}`}>
                {form.testContent.length}자 ·{' '}
                {form.testContent.trim().split(/\s+/).filter(Boolean).length}단어
              </div>
            )}
          </Field>
        </div>

        {/* 상세 기록 */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>
            상세 기록{' '}
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)' }}>선택</span>
          </div>

          <Field label="사용 재료">
            <textarea
              className="form-input"
              style={{ minHeight: 72, resize: 'vertical' }}
              value={form.materials}
              onChange={e => updateField('materials', e.target.value)}
              placeholder="재료명, 사용량 등"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="맛 평가">
              <textarea
                className="form-input"
                style={{ minHeight: 80, resize: 'vertical' }}
                value={form.tasteEval}
                onChange={e => updateField('tasteEval', e.target.value)}
                placeholder="맛, 식감, 외관 등"
              />
            </Field>
            <Field label="상무님 평가">
              <textarea
                className="form-input"
                style={{ minHeight: 80, resize: 'vertical' }}
                value={form.managerEval}
                onChange={e => updateField('managerEval', e.target.value)}
                placeholder="평가 내용"
              />
            </Field>
          </div>

          <Field label="원가 검토 메모">
            <input
              className="form-input"
              value={form.costNote}
              onChange={e => updateField('costNote', e.target.value)}
              placeholder="예) 베이컨 40g 변경 시 원가율 +1.2%p"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="개선점">
              <textarea
                className="form-input"
                style={{ minHeight: 72, resize: 'vertical' }}
                value={form.improvements}
                onChange={e => updateField('improvements', e.target.value)}
                placeholder="보완할 부분"
              />
            </Field>
            <Field label="다음 액션">
              <textarea
                className="form-input"
                style={{ minHeight: 72, resize: 'vertical' }}
                value={form.nextAction}
                onChange={e => updateField('nextAction', e.target.value)}
                placeholder="재테스트 방향, 일정 등"
              />
            </Field>
          </div>

          <Field label="보고용 요약" hint="직접 입력 또는 우측 자동 생성 복사">
            <textarea
              className="form-input"
              style={{ minHeight: 72, resize: 'vertical' }}
              value={form.reportSummary}
              onChange={e => updateField('reportSummary', e.target.value)}
              placeholder="보고 시 사용할 요약 문구를 입력하세요."
            />
          </Field>

          <Field label="태그" hint="입력 후 Enter 또는 콤마">
            <TagInput
              value={form.tags}
              onChange={v => updateField('tags', v)}
              suggestions={allTags}
            />
          </Field>
        </div>

        {/* 사진 첨부 */}
        <NotePhotoSection photos={form.photos || []} onChange={v => updateField('photos', v)} />

        {/* 임시 원가 계산 */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>
            임시 원가 계산
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
            식자재를 검색해 대략적인 원가율을 계산합니다. 저장 시 함께 보관됩니다.
          </div>

          {/* 재료 검색 */}
          <div style={{ position: 'relative', marginBottom: 12 }} ref={searchRef}>
            <input
              className="form-input"
              value={ingSearch}
              onChange={e => {
                setIngSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => ingSearch.trim() && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="재료명 검색 후 클릭해서 추가…"
            />
            {showDropdown && ingSearch.trim() && filteredIngs.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: 'var(--shadow-md)',
                  padding: '12px 14px',
                  fontSize: 12,
                  color: 'var(--text-3)',
                }}
              >
                "{ingSearch}" 결과 없음 — 식자재 관리에서 먼저 등록하세요
              </div>
            )}
            {showDropdown && filteredIngs.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: 'var(--shadow-md)',
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {filteredIngs.map(ing => {
                  const name = ing.ingredientName || ing.productName || '';
                  const baseQty = ing.baseQuantity;
                  const price = ing.priceOverride ?? ing.price ?? null;
                  const up = calcUnitPrice(price, baseQty);
                  return (
                    <button
                      key={ing.id}
                      onMouseDown={() => addIngRow(ing)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: 'var(--text-1)',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{name}</span>
                      {up != null && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-3)' }}>
                          {up.toLocaleString()}원/{ing.baseUnitType || 'g'}
                        </span>
                      )}
                      {ing.category && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 10,
                            background: 'var(--surface-2)',
                            color: 'var(--text-3)',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}
                        >
                          {ing.category}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 재료 테이블 */}
          {parsedCostCalc.rows.length > 0 ? (
            <div style={{ overflowX: 'auto', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['재료명', '사용량', '단가(원)', '소계(원)', ''].map(h => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '4px 8px',
                          color: 'var(--text-3)',
                          fontWeight: 600,
                          fontSize: 11,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedCostCalc.rows.map(r => {
                    const subtotal = (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0);
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                        <td style={{ padding: '6px 8px', color: 'var(--text-1)', minWidth: 100 }}>
                          {r.name}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              className="form-input"
                              style={{ width: 64, padding: '3px 6px', fontSize: 12 }}
                              type="number"
                              min="0"
                              value={r.quantity}
                              onChange={e => updateIngRow(r.id, 'quantity', nonNeg(e.target.value))}
                              placeholder="0"
                            />
                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.unit}</span>
                          </div>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            className="form-input"
                            style={{ width: 80, padding: '3px 6px', fontSize: 12 }}
                            type="number"
                            min="0"
                            value={r.unitPrice}
                            onChange={e => updateIngRow(r.id, 'unitPrice', nonNeg(e.target.value))}
                            placeholder="0"
                          />
                        </td>
                        <td
                          style={{
                            padding: '6px 8px',
                            color: 'var(--text-2)',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {subtotal > 0 ? Math.round(subtotal).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '6px 4px' }}>
                          <button
                            onClick={() => removeIngRow(r.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-4)',
                              padding: 2,
                            }}
                          >
                            <Icon.close style={{ width: 13, height: 13 }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '20px 0',
                color: 'var(--text-4)',
                fontSize: 12,
              }}
            >
              재료를 검색해서 추가하세요
            </div>
          )}

          {/* 원가 합계 + 원가율 */}
          <div
            style={{
              background: 'var(--surface-2)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '8px 16px',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>식재료 원가 합계</span>
            <span
              style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', textAlign: 'right' }}
            >
              {Math.round(totalCost).toLocaleString()}원
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                판매가 입력
              </span>
              <input
                className="form-input"
                style={{ width: 100, padding: '3px 8px', fontSize: 12 }}
                type="number"
                min="0"
                value={parsedCostCalc.sellingPrice}
                onChange={e => updCost(parsedCostCalc.rows, nonNeg(e.target.value))}
                placeholder="판매가"
              />
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>원</span>
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                textAlign: 'right',
                color:
                  costRate == null
                    ? 'var(--text-3)'
                    : Number(costRate) > 35
                      ? 'var(--negative)'
                      : 'var(--positive)',
              }}
            >
              {costRate != null ? `${costRate}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 우측: 요약 카드 ── */}
      <div className="form-sticky-right" style={{ position: 'sticky', top: 80 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>
            보고용 요약
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
            입력 내용이 자동으로 요약됩니다.
          </div>
          <pre
            style={{
              background: 'var(--surface-2)',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 12,
              lineHeight: 1.8,
              color: 'var(--text-2)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {reportText}
          </pre>
          <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={copyReport}>
            <Icon.doc style={{ width: 13, height: 13 }} /> 보고용 복사
          </button>
        </div>
      </div>
    </div>
  );
}

/** 노트 사진 첨부 카드 (샘플기록과 동일한 base64 JPEG 방식) */
function NotePhotoSection({ photos, onChange }) {
  const fileRef = useRef(null);

  async function addFiles(files) {
    const remaining = MAX_NOTE_PHOTOS - photos.length;
    if (remaining <= 0) {
      showToast(`사진은 최대 ${MAX_NOTE_PHOTOS}장까지 추가할 수 있습니다`, 'warn');
      return;
    }
    const targets = Array.from(files).slice(0, remaining);
    const settled = await Promise.allSettled(targets.map(f => resizePhoto(f)));
    const resized = [];
    const failed = [];
    settled.forEach((res, i) => {
      if (res.status === 'fulfilled') resized.push({ ...res.value, caption: '' });
      else failed.push(targets[i].name);
    });
    if (resized.length) onChange([...photos, ...resized]);
    if (failed.length) showToast(`사진 처리 실패: ${failed.join(', ')}`, 'warn');
  }

  function removePhoto(idx) {
    onChange(photos.filter((_, i) => i !== idx));
  }
  function setCaption(idx, v) {
    onChange(photos.map((p, i) => (i === idx ? { ...p, caption: v } : p)));
  }

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div className="card-title" style={{ margin: 0 }}>
          사진 첨부
          {photos.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-3)' }}>
              {photos.length}/{MAX_NOTE_PHOTOS}
            </span>
          )}
        </div>
        {photos.length < MAX_NOTE_PHOTOS && (
          <button type="button" className="btn sm" onClick={() => fileRef.current?.click()}>
            <Icon.plus style={{ width: 12, height: 12 }} /> 사진 추가
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {photos.length < MAX_NOTE_PHOTOS && (
        <div
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 10,
            padding: '20px 16px',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text-3)',
            cursor: 'pointer',
            marginBottom: photos.length > 0 ? 12 : 0,
          }}
          onClick={() => fileRef.current?.click()}
          onDrop={e => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          onDragOver={e => e.preventDefault()}
        >
          드래그하거나 클릭해 사진 추가 · 최대 {MAX_NOTE_PHOTOS}장 · 5MB 이하
        </div>
      )}

      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position: 'relative' }}>
              {i === 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: 'var(--accent)',
                    color: '#fff',
                    zIndex: 1,
                  }}
                >
                  대표
                </span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(i)}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(0,0,0,.5)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
              >
                <Icon.close style={{ width: 11, height: 11 }} />
              </button>
              <img
                src={p.data}
                alt={p.name}
                style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  objectFit: 'cover',
                  borderRadius: 8,
                  display: 'block',
                }}
              />
              <input
                className="form-input"
                value={p.caption}
                onChange={e => setCaption(i, e.target.value)}
                placeholder="캡션 (선택)"
                style={{ marginTop: 4, fontSize: 12 }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
