'use client';
import { useEffect, useState } from 'react';

/**
 * DbVersionNotice — 다른 탭에서 DB가 업그레이드되었거나(업그레이드 차단 포함)
 * 현재 탭이 오래된 버전을 잡고 있을 때 새로고침을 안내하는 배너.
 *
 * lib/db/init.js 가 dispatch하는 'db:version-changed'(다른 탭에서 버전 변경 후
 * 현재 탭 연결이 닫힘) / 'db:blocked'(현재 탭이 업그레이드를 막고 있음)
 * 이벤트를 수신한다. 기존에는 이벤트만 발생하고 수신하는 쪽이 없었다.
 */
export default function DbVersionNotice() {
  const [reason, setReason] = useState(null); // null | 'changed' | 'blocked'

  useEffect(() => {
    const onChanged = () => setReason('changed');
    const onBlocked = () => setReason(prev => prev || 'blocked');
    window.addEventListener('db:version-changed', onChanged);
    window.addEventListener('db:blocked', onBlocked);
    return () => {
      window.removeEventListener('db:version-changed', onChanged);
      window.removeEventListener('db:blocked', onBlocked);
    };
  }, []);

  if (!reason) return null;

  const message =
    reason === 'changed'
      ? '다른 탭에서 데이터베이스가 업데이트되었습니다. 새로고침해 주세요.'
      : '다른 탭이 열려 있어 데이터베이스 업데이트가 보류되었습니다. 다른 탭을 닫거나 새로고침해 주세요.';

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '10px 16px',
        fontSize: 13,
        fontWeight: 700,
        background: 'var(--warn)',
        color: '#fff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        animation: 'slide-down 240ms cubic-bezier(0.2,0.8,0.2,1) both',
      }}
    >
      <span style={{ fontSize: 15 }}>⚠</span>
      <span style={{ textAlign: 'center' }}>{message}</span>
      <button
        className="btn sm"
        style={{ background: '#fff', color: 'var(--warn)', borderColor: '#fff', flexShrink: 0 }}
        onClick={() => window.location.reload()}
      >
        새로고침
      </button>
    </div>
  );
}
