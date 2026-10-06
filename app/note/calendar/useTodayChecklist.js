'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { showToast } from '@/components/Toast';
import { addNote, deleteNote, getAllNotes, updateNote } from '@/lib/note';
import { noteDayKey } from '@/lib/note/day-key';
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

// 로컬 달력 일자 기준(createdAt UTC 앞 10자리를 쓰면 오전 9시 전 작성분이 전날로 잡혔다)
const noteDateKey = noteDayKey;

export function useTodayChecklist({ today, load, canEdit = false }) {
  const syncQueueRef = useRef(Promise.resolve());
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

  const runChecklistJournalSync = useCallback(
    async items => {
      if (!canEdit) return;
      const doneItems = (Array.isArray(items) ? items : []).filter(item => item.done && item.text);
      const legacyTitle = checklistJournalTitle(today);
      // 직전 체크가 아직 저장 중일 수 있어 화면 상태(notes)가 아니라 저장소에서 다시 읽는다
      const todayNotes = (await getAllNotes()).filter(note => noteDateKey(note) === today);
      // 같은 날 일지가 둘이면 연구일지 화면과 같은 것(가장 먼저 만든 일지)에 써야 한다 —
      // getAllNotes는 최신순이라 그대로 find하면 화면에서 고칠 수 없는 다른 일지에 들어갔다.
      const journalEntry = todayNotes
        .filter(note => note?.noteType === JOURNAL_NOTE_TYPE)
        .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))[0];
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
    [canEdit, load, today]
  );

  // 연속 체크가 한꺼번에 '일지 없음'으로 보고 각각 노트를 만들지 않도록 한 번에 하나씩 처리한다
  const syncChecklistJournal = useCallback(
    items => {
      // 앞선 저장이 실패해도(그 호출자가 이미 오류를 알렸다) 다음 저장은 이어서 진행한다
      const run = syncQueueRef.current
        .catch(error => console.warn('[checklist] 이전 일지 저장 실패:', error?.message))
        .then(() => runChecklistJournalSync(items));
      syncQueueRef.current = run;
      return run;
    },
    [runChecklistJournalSync]
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
