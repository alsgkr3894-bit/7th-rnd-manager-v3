import { useEffect, useState, useRef } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const MAX_HISTORY = 5;
const DEBOUNCE_MS = 1000;

export function normalizeSearchHistory(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const history = value.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);

  return history
    .filter(item => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, MAX_HISTORY);
}

export function useSearchHistory(storageKey) {
  const [history, setHistory] = useLocalStorage(storageKey, [], normalizeSearchHistory);
  const [isOpen, setIsOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function add(query) {
    const q = typeof query === 'string' ? query.trim() : '';
    if (!q) return;
    setHistory(prev => {
      const next = [q, ...prev.filter(h => h !== q)].slice(0, MAX_HISTORY);
      return next;
    });
  }

  function scheduleAdd(query) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => add(query), DEBOUNCE_MS);
  }

  function cancelScheduled() {
    if (timer.current) clearTimeout(timer.current);
  }

  return { history, isOpen, setIsOpen, add, scheduleAdd, cancelScheduled };
}
