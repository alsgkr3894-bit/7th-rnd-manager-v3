'use client';
import { useEffect, useRef } from 'react';
import { showToast } from '@/components/Toast';

export function normalizeDraftRestoreValue(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

export function parseDraftRestoreValue(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    return normalizeDraftRestoreValue(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function useDraftRestore(key, apply) {
  const applyRef = useRef(apply);
  useEffect(() => { applyRef.current = apply; });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      const draft = parseDraftRestoreValue(raw);
      if (!draft || typeof applyRef.current !== 'function') return;
      applyRef.current(draft);
      showToast('이전 임시 저장본을 복원했어요', 'ok');
    } catch {}
  }, [key]);
}
