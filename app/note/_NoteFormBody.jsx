'use client';
import { useState, useEffect, useMemo } from 'react';
import { initDB } from '@/lib/db';
import { TempCostCalculator } from '@/components/note/TempCostCalculator';
import { CATEGORIES, NOTE_TYPES, STATUSES, getAllNotes } from '@/lib/note';
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

export function NoteFormBody({ form, setForm, onCategoryChange = noop }) {
  const updateField = makeFieldUpdater(setForm);
  const [allTags, setAllTags] = useState([]);
  const [menuNames, setMenuNames] = useState([]);
  const [touched, setTouched] = useState({});

  function markTouched(key) {
    setTouched(value => ({ ...value, [key]: true }));
  }

  useEffect(() => {
    initDB()
      .then(() => getAllNotes())
      .then(notes => {
        const tagSet = new Set();
        const nameSet = new Set();
        notes.forEach(note => {
          (note.tags || '')
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean)
            .forEach(tag => tagSet.add(tag));
          if (note.menuName?.trim()) nameSet.add(note.menuName.trim());
        });
        setAllTags([...tagSet]);
        setMenuNames([...nameSet]);
      })
      .catch(err => console.warn('[NoteFormBody]', err));
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
          menuNames={menuNames}
          touched={touched}
          updateField={updateField}
          markTouched={markTouched}
          onCategoryChange={onCategoryChange}
        />
        <NoteDetailFields form={form} allTags={allTags} updateField={updateField} />
        <NotePhotoSection photos={form.photos || []} onChange={value => updateField('photos', value)} />
        <TempCostCalculator
          value={form.tempCostCalc}
          onChange={value => updateField('tempCostCalc', value)}
        />
      </div>
      <NoteReportSummaryCard reportText={reportText} />
    </div>
  );
}
