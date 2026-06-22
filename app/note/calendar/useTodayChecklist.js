'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import { addNote, deleteNote, updateNote } from '@/lib/note';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { getJSONLS, setJSONLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import {
  checklistJournalContent,
  checklistJournalTitle,
  normalizeChecklistMap,
} from './_calendar-utils';

export function useTodayChecklist({ today, notes, load, canEdit = false }) {
  const [checklistMap, setChecklistMap] = useState({});
  const [checkInput, setCheckInput] = useState('');
  const todayChecklist = useMemo(() => checklistMap[today] || [], [checklistMap, today]);

  useEffect(() => {
    setChecklistMap(normalizeChecklistMap(getJSONLS(KEYS.NOTE_CALENDAR_CHECKLIST)));
  }, []);

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
      const title = checklistJournalTitle(today);
      const existing = notes.find(
        note =>
          asDisplayText(note.title) === title && asDisplayText(note.testDate).slice(0, 10) === today
      );

      if (doneItems.length === 0) {
        if (existing?.id != null) await deleteNote(existing.id);
        await load();
        return;
      }

      const data = {
        title,
        menuName: '체크리스트',
        category: '기타',
        noteType: '체크리스트',
        status: '출시예정',
        testDate: today,
        testContent: checklistJournalContent(doneItems),
        reportSummary: `${doneItems.length}개 완료`,
        tags: '체크리스트',
      };
      if (existing?.id != null) await updateNote(existing.id, data);
      else await addNote(data);
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
