'use client';
import { useEffect, useRef } from 'react';
import { showToast } from '@/components/Toast';

export function useDraftRestore(key, apply) {
  const applyRef = useRef(apply);
  useEffect(() => { applyRef.current = apply; });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft) return;
      applyRef.current(draft);
      showToast('이전 임시 저장본을 복원했어요', 'ok');
    } catch {}
  }, [key]);
}
