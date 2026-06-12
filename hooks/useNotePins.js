import { useState } from 'react';
import { KEYS } from '@/lib/note/keys';

function normalizeIdList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(id => typeof id === 'string' || typeof id === 'number');
}

export function useNotePins() {
  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      return new Set(normalizeIdList(JSON.parse(localStorage.getItem(KEYS.NOTE_PINS) || '[]')));
    } catch {
      return new Set();
    }
  });

  function togglePin(noteId, e) {
    e?.stopPropagation();
    setPinnedIds(prev => {
      const next = new Set(prev);
      next.has(noteId) ? next.delete(noteId) : next.add(noteId);
      try {
        localStorage.setItem(KEYS.NOTE_PINS, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  return { pinnedIds, togglePin };
}
