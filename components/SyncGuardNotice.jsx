'use client';
import { useEffect, useState } from 'react';
import { getActiveBrandId } from '@/lib/active-brand';
import { evaluateSyncGuard, getSyncGuardState } from '@/lib/db/sync-guard';
import { isAuthoritativeClient, isSyncModeForcedReadonly } from '@/lib/db/sync-mode';
import { formatNumber } from '@/lib/format';

/**
 * SyncGuardNotice — 로컬이 비어 있는 authoritative 브라우저가 서버 데이터를 id 충돌로
 * 덮어쓰지 못하게 막는 lib/db/sync-guard.js의 상태를 전역 배너로 보여준다.
 *
 * 2026-09-17 사고(샌드박스 브라우저가 실서버 엣지 원가·영양성분·메뉴마스터 145행을
 * 덮어씀) 재발 방지용 — 샌드박스 격리(dev-sandbox.mjs)는 포트 하나만 막을 뿐, 새 PC나
 * 브라우저 초기화 후 진짜 운영 포트로 접속해도 같은 조건이 재현되므로 여기서 잡는다.
 */
export default function SyncGuardNotice() {
  const [state, setState] = useState(null);

  useEffect(() => {
    // 강제 읽기전용(샌드박스)이거나 애초에 authoritative가 아니면 이 브라우저는 서버에
    // 아무것도 안 미니 가드가 무의미하다.
    if (isSyncModeForcedReadonly() || !isAuthoritativeClient()) return undefined;

    evaluateSyncGuard(getActiveBrandId()).then(setState);
    function onGuardEvent(event) {
      setState(event?.detail || getSyncGuardState());
    }
    window.addEventListener('server-sync:guard', onGuardEvent);
    return () => window.removeEventListener('server-sync:guard', onGuardEvent);
  }, []);

  if (!state?.blocked) return null;

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
        background: 'var(--negative)',
        color: '#fff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        animation: 'slide-down 240ms cubic-bezier(0.2,0.8,0.2,1) both',
      }}
    >
      <span style={{ fontSize: 15 }}>⚠</span>
      <span style={{ textAlign: 'center' }}>
        서버에 데이터 {formatNumber(state.serverRows)}건이 있는데 이 브라우저는 비어 있습니다. 서버
        데이터를 먼저 불러오기 전까지 이 브라우저의 변경은 서버에 저장되지 않습니다
        {state.heldCount > 0 ? ` (보류 ${formatNumber(state.heldCount)}건)` : ''}.
      </span>
      <a
        className="btn sm"
        href="/settings/sync"
        style={{ background: '#fff', color: 'var(--negative)', borderColor: '#fff', flexShrink: 0 }}
      >
        서버에서 불러오기
      </a>
    </div>
  );
}
