'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { addNote, deleteNote, updateNote } from '@/lib/note';
import { CATEGORIES, JOURNAL_NOTE_TYPE, NOTE_STATUS } from '@/lib/note/constants';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { getJSONLS, setJSONLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import {
  checklistJournalTitle,
  normalizeChecklistMap,
  rollOverChecklistMap,
} from './_calendar-utils';
import { mergeChecklistJournalContent } from './checklistJournalMerge';

function noteDateKey(note) {
  return asDisplayText(note?.testDate || note?.createdAt).slice(0, 10);
}

export function useTodayChecklist({ today, notes, load, canEdit = false }) {
  const [checklistMap, setChecklistMap] = useState({});
  const [checkInput, setCheckInput] = useState('');
  const todayChecklist = useMemo(() => checklistMap[today] || [], [checklistMap, today]);

  useEffect(() => {
    const normalized = normalizeChecklistMap(getJSONLS(KEYS.NOTE_CALENDAR_CHECKLIST));
    const rolled = rollOverChecklistMap(normalized, today);
    setChecklistMap(rolled);
    if (JSON.stringify(rolled) !== JSON.stringify(normalized)) {
      setJSONLS(KEYS.NOTE_CALENDAR_CHECKLIST, rolled);
    }
  }, [today]);

  const saveTodayChecklist = useCallback(
    items => {
      const next = { ...checklistMap };
      const safeItems = Array.isArray(items) ? items.filter(item => item.text) : [];
      if (safeItems.length) next[today] = safeItems;
      else delete next[today];
      setChecklistMap(next);
      setJSONLS(KEYS.NOTE_CALENDAR_CHECKLIST, next);
      return safeItems;
    },
    [checklistMap, today]
  );

  const addChecklistItem = useCallback(() => {
    if (!canEdit) return;
    const text = checkInput.trim();
    if (!text) return;
    saveTodayChecklist([...todayChecklist, { id: `${today}-${Date.now()}`, text, done: false }]);
    setCheckInput('');
  }, [canEdit, checkInput, saveTodayChecklist, today, todayChecklist]);

  const syncChecklistJournal = useCallback(
    async items => {
      if (!canEdit) return;
      const doneItems = (Array.isArray(items) ? items : []).filter(item => item.done && item.text);
      const legacyTitle = checklistJournalTitle(today);
      const todayNotes = Array.isArray(notes)
        ? notes.filter(note => noteDateKey(note) === today)
        : [];
      const journalEntry = todayNotes.find(note => note?.noteType === JOURNAL_NOTE_TYPE);
      const legacyChecklistNotes = todayNotes.filter(
        note => asDisplayText(note.title) === legacyTitle
      );
      const existingContent =
        journalEntry?.testContent || legacyChecklistNotes[0]?.testContent || '';
      const mergedContent = mergeChecklistJournalContent(existingContent, doneItems);

      if (doneItems.length === 0) {
        if (journalEntry?.id != null && journalEntry.testContent !== mergedContent) {
          await updateNote(journalEntry.id, { ...journalEntry, testContent: mergedContent });
        }
        await Promise.all(
          legacyChecklistNotes
            .filter(note => note?.id != null && note.id !== journalEntry?.id)
            .map(note => deleteNote(note.id))
        );
        await load();
        return;
      }

      const title = journalEntry?.title || `${today} ${JOURNAL_NOTE_TYPE}`;
      const data = {
        ...(journalEntry || {}),
        title,
        menuName: journalEntry?.menuName || title,
        category: journalEntry?.category || CATEGORIES[CATEGORIES.length - 1],
        noteType: JOURNAL_NOTE_TYPE,
        status: journalEntry?.status || NOTE_STATUS.TEST,
        testDate: today,
        testContent: mergedContent,
        tags: journalEntry?.tags || JOURNAL_NOTE_TYPE,
      };
      if (journalEntry?.id != null) await updateNote(journalEntry.id, data);
      else await addNote(data);
      await Promise.all(
        legacyChecklistNotes
          .filter(note => note?.id != null && note.id !== journalEntry?.id)
          .map(note => deleteNote(note.id))
      );
      await load();
    },
    [canEdit, load, notes, today]
  );

  const toggleChecklistItem = useCallback(
    async id => {
      if (!canEdit) return;
      const nextItems = saveTodayChecklist(
        todayChecklist.map(item => (item.id === id ? { ...item, done: !item.done } : item))
      );
      try {
        await syncChecklistJournal(nextItems);
        showToast('연구일지에 체크리스트를 저장했습니다', 'ok');
      } catch (error) {
        showToast(
          '연구일지 저장 실패: ' + asDisplayText(error?.message, '알 수 없는 오류'),
          'error'
        );
      }
    },
    [canEdit, saveTodayChecklist, syncChecklistJournal, todayChecklist]
  );

  const removeChecklistItem = useCallback(
    async id => {
      if (!canEdit) return;
      const nextItems = saveTodayChecklist(todayChecklist.filter(item => item.id !== id));
      try {
        await syncChecklistJournal(nextItems);
      } catch (error) {
        showToast(
          '연구일지 동기화 실패: ' + asDisplayText(error?.message, '알 수 없는 오류'),
          'error'
        );
      }
    },
    [canEdit, saveTodayChecklist, syncChecklistJournal, todayChecklist]
  );

  return {
    todayChecklist,
    checkInput,
    setCheckInput,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
  };
}
