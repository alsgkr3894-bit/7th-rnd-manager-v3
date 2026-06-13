import { useRef, useState } from 'react';
import { showToast } from '@/components/Toast';

export function useDiagnostics() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [collecting, setCollecting] = useState(false);
  const collectingRef = useRef(false);

  async function collectDiagnostics() {
    if (collectingRef.current) return;

    collectingRef.current = true;
    setCollecting(true);
    try {
      const storage = navigator.storage?.estimate
        ? await navigator.storage.estimate().catch(() => null)
        : null;
      const nav = performance.getEntriesByType?.('navigation')?.[0];
      setDiagnostics({
        at: new Date().toLocaleString('ko-KR'),
        url: window.location.href,
        userAgent: navigator.userAgent,
        storageUsage: storage?.usage ?? null,
        storageQuota: storage?.quota ?? null,
        navigationType: nav?.type || 'unknown',
        loadMs: nav ? Math.round(nav.loadEventEnd || nav.duration || 0) : null,
      });
      showToast('진단 정보를 수집했어요', 'ok');
    } finally {
      collectingRef.current = false;
      setCollecting(false);
    }
  }

  return { diagnostics, collectDiagnostics, collecting };
}
