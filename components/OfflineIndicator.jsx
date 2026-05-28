'use client';
import { useEffect, useState } from 'react';

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [justBack, setJustBack] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    function onOffline() { setOnline(false); setJustBack(false); }
    function onOnline()  { setOnline(true);  setJustBack(true); setTimeout(() => setJustBack(false), 3000); }
    window.addEventListener('offline', onOffline);
    window.addEventListener('online',  onOnline);
    return () => { window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline); };
  }, []);

  if (online && !justBack) return null;

  return (
    <div className="offline-indicator" style={{
      position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)',
      zIndex:998, pointerEvents:'none',
      animation: 'slide-up 240ms cubic-bezier(0.2,0.8,0.2,1) both',
    }}>
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        padding:'8px 18px', borderRadius:20, fontWeight:700, fontSize:13,
        boxShadow:'0 4px 20px rgba(0,0,0,0.22)',
        background: online ? 'var(--positive)' : 'var(--warn)',
        color: '#fff',
        whiteSpace:'nowrap',
      }}>
        <span style={{ fontSize:15 }}>{online ? '✓' : '⚠'}</span>
        {online ? '인터넷 연결됨 — 로컬 데이터는 안전해요' : '오프라인 — 데이터는 기기에 저장됩니다'}
      </div>
    </div>
  );
}
