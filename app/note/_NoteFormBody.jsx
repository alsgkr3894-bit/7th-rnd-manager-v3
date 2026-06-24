'use client';
import { useState, useEffect, useMemo } from 'react';
import { initDB } from '@/lib/db';
import { TempCostCalculator } from '@/components/note/TempCostCalculator';
import { CATEGORIES, NOTE_TYPES, STATUSES, getAllNotesCached } from '@/lib/note';
import { generateNoteReportText } from '@/lib/note/report';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { noop } from '@/lib/ui/prop-guards';
import { NoteDetailFields } from '@/app/note/_NoteDetailFields';
import { NotePhotoSection } from '@/app/note/_NotePhotoSection';
import { NoteReportSummaryCard } from '@/app/note/_NoteReportSummaryCard';
import { NoteRequiredFields } from '@/app/note/_NoteRequiredFields';

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

export function normalizeNoteFormForSave(form) {
  const title = String(form?.title || form?.menuName || '').trim();
  return { ...form, title, menuName: title };
}

export function NoteFormBody({ form, setForm, onCategoryChange = noop }) {
  const updateField = makeFieldUpdater(setForm);
  const [allTags, setAllTags] = useState([]);
  const [touched, setTouched] = useState({});

  function markTouched(key) {
    setTouched(value => ({ ...value, [key]: true }));
  }

  function updateTitle(value) {
    setForm(prev => ({ ...prev, title: value, menuName: value }));
  }

  useEffect(() => {
    let alive = true;
    initDB()
      .then(() => getAllNotesCached())
      .then(notes => {
        if (!alive) return;
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

  const reportText = useMemo(() => generateNoteReportText(form), [form]);

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <NoteRequiredFields
          form={form}
          touched={touched}
          updateTitle={updateTitle}
          updateField={updateField}
          markTouched={markTouched}
          onCategoryChange={onCategoryChange}
        />
        <NoteDetailFields form={form} allTags={allTags} updateField={updateField} />
        <NotePhotoSection
          photos={form.photos || []}
          onChange={value => updateField('photos', value)}
        />
        <TempCostCalculator
          value={form.tempCostCalc}
          onChange={value => updateField('tempCostCalc', value)}
        />
      </div>
      <NoteReportSummaryCard reportText={reportText} />
    </div>
  );
}
