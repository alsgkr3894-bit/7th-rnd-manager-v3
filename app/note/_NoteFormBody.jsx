'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { TempCostCalculator } from '@/components/note/TempCostCalculator';
import {
  CATEGORIES,
  NOTE_TYPES,
  STATUSES,
  STATUS_COLORS,
  NOTE_BRANDS,
  getAllNotes,
} from '@/lib/note';
import { TagInput } from '@/components/ui/TagInput';
import { ComboBox } from '@/components/ui/ComboBox';
import { SegGroup, Field } from '@/components/note/FormFields';
import { generateNoteReportText } from '@/lib/note/report';
import { isSupportedImageFile, resizePhoto } from '@/lib/image/resize';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { copyText } from '@/lib/ui/clipboard';
import { noop } from '@/lib/ui/prop-guards';

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
  issues: '',
  nextAction: '',
  reportSummary: '',
  tags: '',
  tempCostCalc: null,
  photos: [],
};

const MAX_NOTE_PHOTOS = 8;

export function NoteFormBody({ form, setForm, onCategoryChange = noop }) {
  const updateField = makeFieldUpdater(setForm);
  const [allTags, setAllTags] = useState([]);
  const [menuNames, setMenuNames] = useState([]);
  const [touched, setTouched] = useState({});
  function markTouched(k) {
    setTouched(t => ({ ...t, [k]: true }));
  }
  useEffect(() => {
    initDB()
      .then(() => getAllNotes())
      .then(notes => {
        const tagSet = new Set();
        const nameSet = new Set();
        notes.forEach(n => {
          (n.tags || '')
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)
            .forEach(t => tagSet.add(t));
          if (n.menuName?.trim()) nameSet.add(n.menuName.trim());
        });
        setAllTags([...tagSet]);
        setMenuNames([...nameSet]);
      })
      .catch(err => console.warn('[NoteFormBody]', err));
  }, []);

  const reportText = useMemo(() => generateNoteReportText(form), [form]);

  async function copyReport() {
    try {
      if (!(await copyText(reportText))) throw new Error('CLIPBOARD_UNAVAILABLE');
      showToast('보고용 요약이 복사됐어요', 'ok');
    } catch {
      showToast('복사 실패 (보안 컨텍스트 필요)', 'warn');
    }
  }

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

          <Field label="제목" error={touched.title && !form.title.trim()}>
            <input
              className="form-input"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              onBlur={() => markTouched('title')}
              placeholder="예) 횡성한우 와사비마요 조합 테스트"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label={form.noteType === '샘플' ? '샘플명 / 메뉴명' : '메뉴명'}>
              <ComboBox
                value={form.menuName}
                onChange={v => {
                  updateField('menuName', v);
                  markTouched('menuName');
                }}
                options={menuNames}
                placeholder={
                  form.noteType === '샘플' ? '예) 와규 패티 / 빅맥형 신메뉴' : '예) 횡성한우쉬림프'
                }
                inputClassName="form-input"
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
                onCategoryChange(v);
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

          <Field label="이슈" hint="발생한 문제·이상 현상 기록">
            <textarea
              className="form-input"
              style={{ minHeight: 72, resize: 'vertical' }}
              value={form.issues}
              onChange={e => updateField('issues', e.target.value)}
              placeholder="예) 반죽 수분 과다로 성형 불가, 굽는 시간 초과 시 탄화 발생 등"
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
        <TempCostCalculator
          value={form.tempCostCalc}
          onChange={v => updateField('tempCostCalc', v)}
        />
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
function NotePhotoSection({ photos = [], onChange }) {
  const fileRef = useRef(null);
  const safePhotos = Array.isArray(photos) ? photos.filter(p => p && typeof p === 'object') : [];
  const change = typeof onChange === 'function' ? onChange : () => {};

  async function addFiles(files) {
    const allFiles = files ? Array.from(files) : [];
    const imageFiles = allFiles.filter(isSupportedImageFile);
    const rejected = allFiles.length - imageFiles.length;
    if (rejected > 0) showToast('지원하지 않는 이미지 파일은 제외했어요', 'warn');

    const remaining = MAX_NOTE_PHOTOS - safePhotos.length;
    if (remaining <= 0) {
      showToast(`사진은 최대 ${MAX_NOTE_PHOTOS}장까지 추가할 수 있습니다`, 'warn');
      return;
    }
    const targets = imageFiles.slice(0, remaining);
    if (targets.length === 0) return;
    const settled = await Promise.allSettled(targets.map(f => resizePhoto(f)));
    const resized = [];
    const failed = [];
    settled.forEach((res, i) => {
      if (res.status === 'fulfilled') resized.push({ ...res.value, caption: '' });
      else failed.push(targets[i].name);
    });
    if (resized.length) change([...safePhotos, ...resized]);
    if (failed.length) showToast(`사진 처리 실패: ${failed.join(', ')}`, 'warn');
  }

  function removePhoto(idx) {
    change(safePhotos.filter((_, i) => i !== idx));
  }
  function setCaption(idx, v) {
    change(safePhotos.map((p, i) => (i === idx ? { ...p, caption: v } : p)));
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
          {safePhotos.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-3)' }}>
              {safePhotos.length}/{MAX_NOTE_PHOTOS}
            </span>
          )}
        </div>
        {safePhotos.length < MAX_NOTE_PHOTOS && (
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

      {safePhotos.length < MAX_NOTE_PHOTOS && (
        <div
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 10,
            padding: '20px 16px',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--text-3)',
            cursor: 'pointer',
            marginBottom: safePhotos.length > 0 ? 12 : 0,
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

      {safePhotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {safePhotos.map((p, i) => (
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
                    color: 'var(--surface)',
                    zIndex: 1,
                  }}
                >
                  대표
                </span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label={`${p.caption || p.name || '사진'} 삭제`}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(0,0,0,.55)',
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
