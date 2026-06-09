'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';

export function PinGate({ onVerify, onCancel }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const errorTimer = useRef(null);

  useEffect(() => () => clearTimeout(errorTimer.current), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const ok = onVerify?.(pin);
    if (!ok) {
      setError(true);
      setPin('');
      clearTimeout(errorTimer.current);
      errorTimer.current = setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <main className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ padding: '40px 48px', textAlign: 'center', width: 'min(340px, 90vw)' }}>
        <div style={{ marginBottom: 20 }}><Icon.gear style={{ width: 40, height: 40, color: 'var(--accent)' }} /></div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>설정 접근 인증</h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>설정을 변경하려면 PIN을 입력하세요</p>
        <form onSubmit={handleSubmit}>
          <input
            className={`form-input ${error ? 'field-error-shake' : ''}`}
            type="password" inputMode="numeric" pattern="[0-9]*"
            value={pin} onChange={e => setPin(e.target.value)}
            placeholder="PIN 입력" maxLength={8} autoFocus
            style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20, marginBottom: 16 }}
          />
          {error && <div style={{ color: 'var(--negative)', fontSize: 13, marginBottom: 12 }}>PIN이 올바르지 않습니다</div>}
          <button className="btn primary" style={{ width: '100%' }} disabled={!pin}>확인</button>
          {onCancel && <button type="button" className="btn" onClick={onCancel} style={{marginTop:8,width:'100%'}}>취소</button>}
        </form>
      </div>
    </main>
  );
}
