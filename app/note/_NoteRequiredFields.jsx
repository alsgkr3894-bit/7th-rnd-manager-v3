'use client';
import { useEffect, useRef, useState } from 'react';
import { SegGroup, Field } from '@/components/note/FormFields';
import { addLocalDays, formatLocalDateInput, todayLocalDate } from '@/lib/date/local-date';
import { CATEGORIES, NOTE_TYPES, STATUSES, STATUS_COLORS, NOTE_BRANDS } from '@/lib/note';
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
  const [quickDateDraft, setQuickDateDraft] = useState('');
  const [quickDateError, setQuickDateError] = useState(false);
  const titleFocusedRef = useRef(false);
  const titleComposingRef = useRef(false);

  useEffect(() => {
    if (titleFocusedRef.current || titleComposingRef.current) return;
    setTitleDraft(titleValue);
  }, [titleValue]);

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

  function handleBrandChange(name) {
    const found = NOTE_BRANDS.find(brand => brand.name === name);
    if (!found || found.id === form.brand) return;
    updateField('brand', found.id);
  }

  function handleCategoryChange(value) {
    if (!CATEGORIES.includes(value) || value === form.category) return;
    updateField('category', value);
    onCategoryChange(value);
  }

  function handleNoteTypeChange(value) {
    if (!NOTE_TYPES.includes(value) || value === form.noteType) return;
    updateField('noteType', value);
  }

  function updateTestDate(value) {
    updateField('testDate', value);
    setQuickDateError(false);
  }

  function applyQuickDate(value = quickDateDraft) {
    const raw = String(value || '').trim();
    if (!raw) {
      setQuickDateError(false);
      return;
    }

    const parsed = parseNoteQuickDate(raw, { referenceDate: form.testDate });
    if (!parsed) {
      setQuickDateError(true);
      return;
    }

    updateTestDate(parsed);
    setQuickDateDraft('');
  }

  function applyPresetDate(value) {
    updateTestDate(value);
    setQuickDateDraft('');
  }

  function applyRelativeDate(days) {
    updateTestDate(formatLocalDateInput(addLocalDays(new Date(), days)));
    setQuickDateDraft('');
  }

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
            필수 항목
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            메뉴와 테스트 내용을 먼저 잡고, 나머지는 짧게 선택합니다.
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

      <NoteFormSection title="메뉴 정보" caption={menuCodeValue || '코드 미입력'} first>
        <Field
          label="작성 방식"
          hint="신규는 코드를 만들고, 기존 메뉴 테스트는 아래 카드에서 메뉴를 고릅니다."
        >
          <SegGroup
            options={['신규 메뉴', '기존 메뉴 테스트']}
            value={modeLabel}
            onChange={handleModeChange}
          />
        </Field>

        <div style={FIELD_GRID_STYLE}>
          <Field label="메뉴 코드" hint="신규 메뉴는 자동 생성하거나 직접 입력할 수 있습니다.">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="form-input"
                value={menuCodeValue}
                onChange={event => updateField('menuCode', event.target.value)}
                placeholder="예: RND-260702-1"
                style={{ minWidth: 0 }}
              />
              <button className="btn sm" type="button" onClick={onGenerateMenuCode}>
                자동 생성
              </button>
            </div>
          </Field>
          <Field
            label="메뉴명 / 노트 제목"
            error={touched.title && !titleValue.trim() && !menuCodeValue.trim()}
          >
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
              placeholder="예: 완성새우 떡라비마요 조합 테스트"
            />
          </Field>
        </div>
      </NoteFormSection>

      <NoteFormSection title="테스트 기본값" caption={`${form.testRound || 1}차`}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(120px, 180px)',
            gap: 12,
          }}
        >
          <Field label="테스트 날짜" hint="YYMMDD · YYYYMMDD">
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                className="form-input"
                type="date"
                value={form.testDate}
                onChange={event => updateTestDate(event.target.value)}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  className="form-input"
                  value={quickDateDraft}
                  inputMode="numeric"
                  aria-label="테스트 날짜 빠른 입력"
                  onChange={event => {
                    setQuickDateDraft(event.target.value);
                    setQuickDateError(false);
                  }}
                  onKeyDown={event => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    applyQuickDate();
                  }}
                  onBlur={() => applyQuickDate()}
                  placeholder="240821"
                  style={{
                    flex: '1 1 104px',
                    minWidth: 0,
                    borderColor: quickDateError ? 'var(--negative)' : undefined,
                  }}
                />
                <button className="btn sm" type="button" onClick={() => applyQuickDate()}>
                  적용
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  className="btn sm xs"
                  type="button"
                  onClick={() => applyPresetDate(todayLocalDate())}
                >
                  오늘
                </button>
                <button className="btn sm xs" type="button" onClick={() => applyRelativeDate(-1)}>
                  어제
                </button>
                <button className="btn sm xs" type="button" onClick={() => applyRelativeDate(-7)}>
                  7일전
                </button>
              </div>
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
              placeholder="예: 1, 2차"
            />
          </Field>
        </div>
      </NoteFormSection>

      <NoteFormSection title="분류와 상태" caption={form.status}>
        <div style={COMPACT_GRID_STYLE}>
          <Field label="브랜드" hint="노트가 속한 브랜드">
            <SegGroup
              options={NOTE_BRANDS.map(brand => brand.name)}
              value={(NOTE_BRANDS.find(brand => brand.id === form.brand) || NOTE_BRANDS[0]).name}
              onChange={handleBrandChange}
            />
          </Field>

          <Field label="개발 구분">
            <SegGroup options={CATEGORIES} value={form.category} onChange={handleCategoryChange} />
          </Field>

          <Field label="유형">
            <SegGroup options={NOTE_TYPES} value={form.noteType} onChange={handleNoteTypeChange} />
          </Field>
        </div>

        <Field label="메뉴 상태" hint="저장하면 같은 메뉴 차수 전체에 적용">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
              gap: 8,
            }}
          >
            {STATUSES.map(status => {
              const colors = STATUS_COLORS[status];
              const active = form.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  style={{
                    minHeight: 34,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: active ? colors.color : 'var(--border)',
                    background: active ? colors.bg : 'var(--surface)',
                    color: active ? colors.color : 'var(--text-3)',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    fontWeight: active ? 800 : 500,
                    cursor: 'pointer',
                  }}
                  onClick={event => {
                    event.stopPropagation();
                    if (form.status !== status) updateField('status', status);
                  }}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </Field>
      </NoteFormSection>

      <NoteFormSection
        title="테스트 내용"
        caption={form.testContent ? `${form.testContent.length}자` : '필수'}
      >
        <Field
          label="시식 테스트 내용"
          required
          error={touched.testContent && !form.testContent.trim()}
        >
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
    </div>
  );
}
