'use client';
import { useEffect, useRef, useState } from 'react';
import { SegGroup, Field } from '@/components/note/FormFields';
import {
  STATUSES,
  NOTE_BRANDS,
  MENU_DEVELOPMENT_NOTE_TYPES,
  getNoteCategoryOptionsForBrand,
} from '@/lib/note';
import { parseNoteQuickDate } from '@/lib/note/date-input';

const SECTION_STYLE = {
  borderTop: '1px solid var(--divider)',
  paddingTop: 16,
  marginTop: 16,
};

const SECTION_HEADER_STYLE = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 12,
};

const SECTION_CAPTION_STYLE = {
  fontSize: 12,
  color: 'var(--text-4)',
  whiteSpace: 'nowrap',
};

const FIELD_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
};

const COMPACT_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
};

function NoteFormSection({ title, caption, children, first = false }) {
  return (
    <section style={first ? undefined : SECTION_STYLE}>
      <div style={SECTION_HEADER_STYLE}>
        <strong style={{ fontSize: 14, color: 'var(--text-1)' }}>{title}</strong>
        {caption && <span style={SECTION_CAPTION_STYLE}>{caption}</span>}
      </div>
      {children}
    </section>
  );
}

export function NoteRequiredFields({
  form,
  touched,
  updateTitle,
  updateField,
  markTouched,
  onCategoryChange,
  onGenerateMenuCode,
}) {
  const titleValue = form.title || form.menuName || '';
  const menuCodeValue = form.menuCode || '';
  const menuTestMode = form.menuTestMode === 'existing' || form.parentId ? 'existing' : 'new';
  const modeLabel = menuTestMode === 'existing' ? '기존 메뉴 테스트' : '신규 메뉴';
  const [titleDraft, setTitleDraft] = useState(titleValue);
  const [dateDraft, setDateDraft] = useState(form.testDate || '');
  const [quickDateError, setQuickDateError] = useState(false);
  const titleFocusedRef = useRef(false);
  const titleComposingRef = useRef(false);

  useEffect(() => {
    if (titleFocusedRef.current || titleComposingRef.current) return;
    setTitleDraft(titleValue);
  }, [titleValue]);

  useEffect(() => {
    setDateDraft(form.testDate || '');
  }, [form.testDate]);

  function commitTitle(value) {
    updateTitle(value);
  }

  function handleTitleChange(event) {
    const value = event.target.value;
    setTitleDraft(value);
    if (!titleComposingRef.current) commitTitle(value);
  }

  function handleTitleBlur() {
    titleFocusedRef.current = false;
    titleComposingRef.current = false;
    commitTitle(titleDraft);
    markTouched('title');
  }

  function handleModeChange(value) {
    const nextMode = value === '기존 메뉴 테스트' ? 'existing' : 'new';
    if (nextMode === menuTestMode) return;
    updateField('menuTestMode', nextMode);
    if (nextMode === 'new') updateField('parentId', null);
  }

  function handleCategoryChange(value) {
    const categoryOptions = getNoteCategoryOptionsForBrand(form.brand);
    if (!categoryOptions.includes(value) || value === form.category) return;
    updateField('category', value);
    onCategoryChange(value);
  }

  function updateTestDate(value) {
    updateField('testDate', value);
    setQuickDateError(false);
  }

  function applyQuickDate(value = dateDraft) {
    const raw = String(value || '').trim();
    if (!raw) {
      updateTestDate('');
      setQuickDateError(false);
      return;
    }

    const parsed = parseNoteQuickDate(raw, { referenceDate: form.testDate });
    if (!parsed) {
      setQuickDateError(true);
      return;
    }

    updateTestDate(parsed);
    setDateDraft(parsed);
  }

  const activeBrand = NOTE_BRANDS.find(brand => brand.id === form.brand) || NOTE_BRANDS[0];
  const categoryOptions = getNoteCategoryOptionsForBrand(form.brand);
  const categoryValue = categoryOptions.includes(form.category)
    ? form.category
    : categoryOptions[0];

  return (
    <div className="card" style={{ padding: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="card-title" style={{ marginBottom: 4 }}>
            노트 작성
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            유형을 먼저 고른 뒤 제목과 테스트 내용을 바로 기록합니다.
          </div>
        </div>
        <span
          style={{
            flex: '0 0 auto',
            border: '1px solid var(--border)',
            borderRadius: 999,
            padding: '5px 10px',
            background: 'var(--surface-2)',
            color: 'var(--text-2)',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {modeLabel}
        </span>
      </div>

      <NoteFormSection title="메뉴 정보" caption={menuCodeValue || '저장 시 자동 코드'} first>
        <Field
          label="작성 방식"
          hint="기존 메뉴 테스트는 아래 이전 차수 복제에서 메뉴를 골라 이어갑니다."
        >
          <SegGroup
            options={['신규 메뉴', '기존 메뉴 테스트']}
            value={modeLabel}
            onChange={handleModeChange}
          />
        </Field>

        <div style={FIELD_GRID_STYLE}>
          <Field label="메뉴명 / 노트 제목">
            <input
              className="form-input"
              value={titleDraft}
              onFocus={() => {
                titleFocusedRef.current = true;
              }}
              onCompositionStart={() => {
                titleComposingRef.current = true;
              }}
              onCompositionEnd={event => {
                titleComposingRef.current = false;
                const value = event.currentTarget.value;
                setTitleDraft(value);
                commitTitle(value);
              }}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              placeholder="메뉴명 또는 테스트 제목"
            />
          </Field>
        </div>
      </NoteFormSection>

      <NoteFormSection title="테스트 기본값" caption={`${form.testRound || 1}차`}>
        <div className="note-test-grid">
          <Field label="테스트 날짜">
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                className="form-input"
                value={dateDraft}
                inputMode="numeric"
                aria-label="테스트 날짜"
                onChange={event => {
                  setDateDraft(event.target.value);
                  setQuickDateError(false);
                }}
                onKeyDown={event => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  applyQuickDate();
                }}
                onBlur={() => applyQuickDate()}
                placeholder="날짜"
                style={{ borderColor: quickDateError ? 'var(--negative)' : undefined }}
              />
              {quickDateError && (
                <div role="alert" style={{ fontSize: 11, color: 'var(--negative)' }}>
                  날짜 확인
                </div>
              )}
            </div>
          </Field>
          <Field label="테스트 차수">
            <input
              className="form-input"
              value={form.testRound || ''}
              onChange={event => updateField('testRound', event.target.value)}
              placeholder="차수"
            />
          </Field>
        </div>
      </NoteFormSection>

      <NoteFormSection title="분류와 상태" caption={form.status}>
        <div style={COMPACT_GRID_STYLE}>
          <Field label="브랜드" hint="노트가 속한 브랜드">
            <div
              style={{
                minHeight: 38,
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface-2)',
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--text-1)',
              }}
            >
              {activeBrand.name}
            </div>
          </Field>

          <Field label="개발 구분">
            <SegGroup
              options={categoryOptions}
              value={categoryValue}
              onChange={handleCategoryChange}
            />
          </Field>
        </div>

        <Field label="유형" hint="저장하면 같은 메뉴 차수 전체에 적용">
          <SegGroup
            options={MENU_DEVELOPMENT_NOTE_TYPES}
            value={
              MENU_DEVELOPMENT_NOTE_TYPES.includes(form.noteType)
                ? form.noteType
                : MENU_DEVELOPMENT_NOTE_TYPES[0]
            }
            onChange={noteType => updateField('noteType', noteType)}
          />
        </Field>

        <Field label="메뉴 상태" hint="저장하면 같은 메뉴 차수 전체에 적용">
          <SegGroup
            options={STATUSES}
            value={form.status}
            onChange={status => updateField('status', status)}
          />
        </Field>
      </NoteFormSection>

      <NoteFormSection
        title="테스트 내용"
        caption={form.testContent ? `${form.testContent.length}자` : '작성 대기'}
      >
        <Field label="시식 테스트 내용">
          <textarea
            className="form-input"
            style={{ minHeight: 180, resize: 'vertical', lineHeight: 1.65 }}
            value={form.testContent}
            onChange={event => updateField('testContent', event.target.value)}
            onBlur={() => markTouched('testContent')}
            placeholder="테스트 조건, 온도·시간·재료 비율, 시식 변경사항 등을 기록하세요."
          />
          {form.testContent && (
            <div className={`char-count${form.testContent.length > 500 ? ' warn' : ''}`}>
              {form.testContent.length}자 ·{' '}
              {form.testContent.trim().split(/\s+/).filter(Boolean).length}단어
            </div>
          )}
        </Field>
      </NoteFormSection>

      <details
        style={{
          borderTop: '1px solid var(--divider)',
          paddingTop: 14,
          marginTop: 16,
        }}
      >
        <summary
          style={{
            cursor: 'pointer',
            color: 'var(--text-3)',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          메뉴코드 설정 · {menuCodeValue || '저장 시 자동 생성'}
        </summary>
        <div style={{ marginTop: 12 }}>
          <Field
            label="메뉴 코드"
            hint="필요할 때만 직접 입력합니다. 비워두면 저장 시 자동 등록됩니다."
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="form-input"
                value={menuCodeValue}
                onChange={event => updateField('menuCode', event.target.value)}
                placeholder="자동 생성"
                style={{ minWidth: 0 }}
              />
              <button className="btn sm" type="button" onClick={onGenerateMenuCode}>
                자동 생성
              </button>
            </div>
          </Field>
        </div>
      </details>
    </div>
  );
}
