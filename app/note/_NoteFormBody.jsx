'use client';
import { useState, useEffect } from 'react';
import { initDB } from '@/lib/db';
import { TempCostCalculator } from '@/components/note/TempCostCalculator';
import {
  CATEGORIES,
  MENU_DEVELOPMENT_NOTE_TYPES,
  STATUSES,
  normalizeNoteCategoryForBrand,
  getAllNotesCached,
  normalizeNoteStatus,
  normalizeNoteType,
} from '@/lib/note';
import { generateNextNoteMenuCode, normalizeNoteMenuCode } from '@/lib/note/evaluation';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { noop } from '@/lib/ui/prop-guards';
import { NoteClonePreviousCard } from '@/app/note/_NoteClonePreviousCard';
import { NoteDetailFields } from '@/app/note/_NoteDetailFields';
import { NoteEvaluationFields } from '@/app/note/_NoteEvaluationFields';
import { NotePhotoSection } from '@/app/note/_NotePhotoSection';
import { NoteRequiredFields } from '@/app/note/_NoteRequiredFields';
import { CollapsibleCard } from '@/app/note/_CollapsibleCard';

// SSR 안전 초기값 — brand와 category는 SSR에서 항상 기본값으로 두고
// 마운트 후 실제 브랜드/저장값으로 교정한다(hydration 불일치 방지).
export const INIT = {
  brand: 'main',
  menuTestMode: 'new',
  menuCode: '',
  title: '',
  menuName: '',
  category: CATEGORIES[0],
  noteType: MENU_DEVELOPMENT_NOTE_TYPES[0],
  status: STATUSES[0],
  testContent: '',
  testDate: '',
  testRound: '',
  materials: '',
  tasteEval: '',
  tasteRating: 0,
  textureRating: 0,
  appearanceRating: 0,
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

export function normalizeNoteFormForSave(form, options = {}) {
  const existingNotes = Array.isArray(options.existingNotes) ? options.existingNotes : [];
  const manualCode = normalizeNoteMenuCode(form?.menuCode);
  const menuCode =
    manualCode ||
    generateNextNoteMenuCode(existingNotes, {
      date: form?.testDate,
    });
  const title = String(form?.title || form?.menuName || menuCode || '').trim();
  const noteType = normalizeNoteType(form?.noteType);
  return {
    ...form,
    menuCode,
    title,
    menuName: title,
    category: normalizeNoteCategoryForBrand(form?.category, form?.brand),
    noteType: MENU_DEVELOPMENT_NOTE_TYPES.includes(noteType)
      ? noteType
      : MENU_DEVELOPMENT_NOTE_TYPES[0],
    status: normalizeNoteStatus(form?.status),
  };
}

function hasText(value) {
  return String(value || '').trim().length > 0;
}

function NoteWriteProgressCard({ form, open, onOpenChange }) {
  const testContent = String(form?.testContent || '').trim();
  const words = testContent ? testContent.split(/\s+/).filter(Boolean).length : 0;
  const items = [
    {
      label: '메뉴',
      done: hasText(form?.title) || hasText(form?.menuName) || hasText(form?.menuCode),
    },
    { label: '테스트 내용', done: hasText(form?.testContent) },
    { label: '일자', done: hasText(form?.testDate) },
    { label: '차수', done: hasText(form?.testRound) },
  ];
  const doneCount = items.filter(item => item.done).length;

  return (
    <CollapsibleCard
      title="작성 진행"
      subtitle={`${doneCount}/${items.length} 완료 · ${testContent.length}자 · ${words}단어`}
      defaultOpen
      open={open}
      onOpenChange={onOpenChange}
      actions={
        <strong
          style={{
            color: doneCount === items.length ? 'var(--positive)' : 'var(--accent)',
            fontSize: 18,
          }}
        >
          {Math.round((doneCount / items.length) * 100)}%
        </strong>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {items.map(item => (
          <span
            key={item.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '7px 9px',
              borderRadius: 8,
              background: item.done ? 'var(--positive-soft)' : 'var(--surface-2)',
              color: item.done ? 'var(--positive)' : 'var(--text-3)',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {item.label}
            <span>{item.done ? '완료' : '필요'}</span>
          </span>
        ))}
      </div>
    </CollapsibleCard>
  );
}

export function NoteFormBody({ form, setForm, onCategoryChange = noop }) {
  const updateField = makeFieldUpdater(setForm);
  const [allTags, setAllTags] = useState([]);
  const [sourceNotes, setSourceNotes] = useState([]);
  const [touched, setTouched] = useState({});
  const [openRightPanel, setOpenRightPanel] = useState('progress');

  function markTouched(key) {
    setTouched(value => ({ ...value, [key]: true }));
  }

  function updateTitle(value) {
    setForm(prev => ({ ...prev, title: value, menuName: value }));
  }

  function generateMenuCode() {
    setForm(prev => ({
      ...prev,
      menuTestMode: 'new',
      menuCode: generateNextNoteMenuCode([...sourceNotes, prev], { date: prev.testDate }),
    }));
  }

  useEffect(() => {
    let alive = true;
    initDB()
      .then(() => getAllNotesCached())
      .then(notes => {
        if (!alive) return;
        setSourceNotes(notes);
        const tagSet = new Set();
        notes.forEach(note => {
          (note.tags || '')
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean)
            .forEach(tag => tagSet.add(tag));
        });
        setAllTags([...tagSet]);
      })
      .catch(err => {
        if (alive) console.warn('[NoteFormBody]', err);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      className="form-layout"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) clamp(320px, 27vw, 390px)',
        gap: 20,
        marginTop: 24,
        alignItems: 'start',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <NoteRequiredFields
          form={form}
          touched={touched}
          updateTitle={updateTitle}
          updateField={updateField}
          markTouched={markTouched}
          onCategoryChange={onCategoryChange}
          onGenerateMenuCode={generateMenuCode}
        />
        <NoteClonePreviousCard form={form} notes={sourceNotes} setForm={setForm} />
        <NoteEvaluationFields form={form} allTags={allTags} updateField={updateField} />
        <NoteDetailFields form={form} updateField={updateField} />
        <TempCostCalculator
          value={form.tempCostCalc}
          onChange={value => updateField('tempCostCalc', value)}
        />
      </div>
      <div
        className="form-sticky-right"
        style={{ position: 'sticky', top: 72, display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <NoteWriteProgressCard
          form={form}
          open={openRightPanel === 'progress'}
          onOpenChange={next => setOpenRightPanel(next ? 'progress' : '')}
        />
        <NotePhotoSection
          photos={form.photos || []}
          onChange={value => updateField('photos', value)}
        />
      </div>
    </div>
  );
}
