import { useMemo } from 'react';
import { KEYS } from '@/lib/note/keys';
import { useLocalStorage } from '@/hooks/useLocalStorage';

function normalizeIdList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(id => typeof id === 'string' || typeof id === 'number');
}

export function useNotePins() {
  const [pinnedList, setPinnedList] = useLocalStorage(KEYS.NOTE_PINS, [], normalizeIdList);
  const pinnedIds = useMemo(() => new Set(pinnedList), [pinnedList]);

  function togglePin(noteId, e) {
    e?.stopPropagation();
    setPinnedList(prev => {
      const next = new Set(normalizeIdList(prev));
      next.has(noteId) ? next.delete(noteId) : next.add(noteId);
      return [...next];
    });
  }

  return { pinnedIds, togglePin };
}
