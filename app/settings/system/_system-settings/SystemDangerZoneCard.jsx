'use client';
import { useState } from 'react';
import { formatNumber } from '@/lib/format';
import { DangerConfirm } from './primitives';

export function SystemDangerZoneCard({
  ready,
  busy,
  roleReady,
  isAdmin,
  totalRows,
  onReset,
  onRecreate,
}) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingRecreate, setConfirmingRecreate] = useState(false);

  return (
    <div className="card" style={{ marginTop: 16, borderColor: 'var(--negative-soft)' }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--negative)' }}>
        위험 영역
      </h2>

      <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>모든 데이터 초기화</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
          모든 store의 데이터를 삭제합니다. schema는 유지되며 빈 store로 남습니다.
          <br />
          백업이 필요한 경우 먼저 <b>데이터 백업</b> 메뉴에서 다운로드하세요.
          <br />
          초기화 후 기본 메뉴 코드를 다시 등록하려면 <b>메뉴 마스터 → 기본 코드 등록</b>을
          실행하세요.
        </p>
        <DangerConfirm
          label="모든 데이터 초기화"
          confirmMsg={`정말 모든 데이터를 삭제할까요? (${formatNumber(totalRows)}건)`}
          confirmLabel={busy ? '삭제 중…' : '정말 삭제'}
          isOpen={confirmingReset}
          onOpen={() => setConfirmingReset(true)}
          onClose={() => setConfirmingReset(false)}
          onConfirm={() => {
            setConfirmingReset(false);
            onReset();
          }}
          disabled={!ready || busy || totalRows === 0 || !roleReady || !isAdmin}
          busy={busy}
        />
      </div>

      <div style={{ paddingTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>DB 완전 재생성</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
          DB 자체를 삭제하고 최신 schema로 새로 생성합니다.
          <br />
          schema 업그레이드가 누락된 경우(<code>NotFoundError</code>) 해결 가능.
          <br />
          실행 후 페이지가 자동 새로고침되며 모든 데이터는 사라집니다.
        </p>
        <DangerConfirm
          label="DB 완전 재생성"
          confirmMsg="DB를 삭제하고 새로 만들까요? (모든 데이터 사라짐)"
          confirmLabel={busy ? '재생성 중…' : '정말 재생성'}
          isOpen={confirmingRecreate}
          onOpen={() => setConfirmingRecreate(true)}
          onClose={() => setConfirmingRecreate(false)}
          onConfirm={() => {
            setConfirmingRecreate(false);
            onRecreate();
          }}
          disabled={!ready || busy || !roleReady || !isAdmin}
          busy={busy}
        />
      </div>
    </div>
  );
}
