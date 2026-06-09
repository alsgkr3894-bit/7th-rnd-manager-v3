'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/Toast';

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [justBack, setJustBack] = useState(false);
  const resetTimer = useRef(null);
  const router = useRouter();

  useEffect(() => {
    setOnline(navigator.onLine);
    function onOffline() {
      clearTimeout(resetTimer.current);
      setOnline(false);
      setJustBack(false);
    }
    function onOnline() {
      setOnline(true);
      setJustBack(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setJustBack(false), 3000);
      showToast('연결이 복구됐어요, 데이터를 갱신 중...', 'ok', 3000);
      router.refresh();
    }
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      clearTimeout(resetTimer.current);
    };
  }, [router]);

  if (online && !justBack) return null;

  return (
    <div
      className="offline-indicator"
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 998,
        pointerEvents: 'none',
        animation: 'slide-up 240ms cubic-bezier(0.2,0.8,0.2,1) both',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 18px',
          borderRadius: 20,
          fontWeight: 700,
          fontSize: 13,
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          background: online ? 'var(--positive)' : 'var(--warn)',
          color: '#fff',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 15 }}>{online ? '✓' : '⚠'}</span>
        {online
          ? '인터넷 연결됨 — 로컬 데이터는 안전해요'
          : '오프라인 — 데이터는 기기에 저장됩니다'}
      </div>
    </div>
  );
}
