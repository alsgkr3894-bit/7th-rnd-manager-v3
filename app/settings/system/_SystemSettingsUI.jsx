'use client';
import { useState } from 'react';
import { formatNumber } from '@/lib/format';

export function SettingsGroup({ title, children, style }) {
  return (
    <div className="card" style={{ marginTop: style?.marginTop ?? 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{title}</h2>
      <div>{children}</div>
    </div>
  );
}

export function SettingsRow({ name, desc, control, last }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 0',
        borderBottom: last ? 'none' : '1px solid var(--border)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ flex: '0 0 auto' }}>{control}</div>
    </div>
  );
}

export function Segmented({ value, options, onChange }) {
  const safeOptions = Array.isArray(options) ? options : [];
  const handleChange = typeof onChange === 'function' ? onChange : () => {};

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {safeOptions.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 8,
              background: active ? 'var(--accent-soft)' : 'var(--surface)',
              color: active ? 'var(--accent-text)' : 'var(--text-2)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function StaticValue({ children }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-2)',
        padding: '6px 12px',
        borderRadius: 8,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
      }}
    >
      {children}
    </div>
  );
}

export function StatusValue({ children, tone = 'default' }) {
  const style =
    tone === 'ok'
      ? {
          background: 'var(--success-soft, rgba(34,197,94,.12))',
          color: 'var(--positive)',
          borderColor: 'color-mix(in srgb, var(--positive) 35%, var(--border))',
        }
      : tone === 'pending'
        ? {
            background: 'var(--warning-soft, rgba(245,158,11,.14))',
            color: 'var(--warning-text, #b45309)',
            borderColor: 'color-mix(in srgb, #f59e0b 35%, var(--border))',
          }
        : {};

  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--text-2)',
        padding: '6px 12px',
        borderRadius: 8,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DangerConfirm({
  label,
  confirmMsg,
  confirmLabel,
  isOpen,
  onOpen,
  onClose,
  onConfirm,
  disabled,
  busy,
}) {
  if (!isOpen) {
    return (
      <button
        className="btn"
        onClick={onOpen}
        disabled={disabled}
        style={{ color: 'var(--negative)', borderColor: 'var(--negative)' }}
      >
        {label}
      </button>
    );
  }
  return (
    <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ color: 'var(--negative)', fontWeight: 600, fontSize: 13 }}>{confirmMsg}</span>
      <button className="btn" disabled={busy} onClick={onClose}>
        취소
      </button>
      <button
        className="btn primary"
        disabled={busy}
        onClick={onConfirm}
        style={{ background: 'var(--negative)' }}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

export function InfoCell({ label, value, big = false, mono = false }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div
        className={mono ? 'num' : ''}
        style={{
          fontSize: big ? 22 : 14,
          fontWeight: big ? 700 : 600,
          fontFamily: mono ? 'monospace' : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function SystemAppInfoCard({ appVersion, dbName, dbVersion, roleReady, isAdmin }) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>앱 정보</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 24,
        }}
      >
        <InfoCell label="앱 버전" value={appVersion} />
        <InfoCell label="DB 이름" value={dbName} mono />
        <InfoCell label="DB 버전" value={dbVersion} />
        <InfoCell label="환경" value="개발 (localhost)" />
        <InfoCell
          label="현재 권한"
          value={!roleReady ? '확인 중…' : isAdmin ? '관리자 (admin)' : '조회자 (viewer)'}
        />
      </div>
    </div>
  );
}

export function SystemStorageStatusCard({
  ready,
  stats,
  storageEst,
  totalStoreCount,
  totalRows,
  busy,
  onReload,
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>저장소 상태</h2>
      {!ready ? (
        <div style={{ color: 'var(--text-3)' }}>DB 초기화 중…</div>
      ) : (
        <>
          {storageEst && <StorageUsageBar usage={storageEst.usage} quota={storageEst.quota} />}
          <div
            style={{
              display: 'flex',
              gap: 32,
              marginBottom: 20,
              padding: '12px 0',
              borderBottom: '1px solid var(--border)',
              marginTop: storageEst ? 16 : 0,
            }}
          >
            <InfoCell label="전체 저장 행" value={`${formatNumber(totalRows)}건`} big />
            <InfoCell label="정의된 store 수" value={`${totalStoreCount}개`} big />
            <InfoCell
              label="데이터 있는 store"
              value={`${stats ? Object.values(stats).filter(n => n > 0).length : 0}개`}
              big
            />
          </div>
          {stats && Object.values(stats).some(n => n > 0) ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
                gap: 12,
              }}
            >
              {Object.entries(stats)
                .filter(([, n]) => n > 0)
                .map(([name, count]) => (
                  <div
                    key={name}
                    style={{
                      padding: 12,
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-3)',
                        fontFamily: 'monospace',
                        marginBottom: 4,
                      }}
                    >
                      {name}
                    </div>
                    <div className="num" style={{ fontSize: 16, fontWeight: 600 }}>
                      {formatNumber(count)}건
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-3)', padding: '8px 0' }}>
              저장된 데이터가 없습니다.
            </div>
          )}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onReload} disabled={busy}>
              새로고침
            </button>
          </div>
        </>
      )}
    </div>
  );
}

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

const STORAGE_WARN_PCT = 70;
const STORAGE_DANGER_PCT = 90;

export function StorageUsageBar({ usage, quota }) {
  const usageMB = (usage / 1024 / 1024).toFixed(1);
  const quotaMB = (quota / 1024 / 1024).toFixed(0);
  const pct = quota > 0 ? Math.min(100, (usage / quota) * 100) : 0;
  const isWarn = pct >= STORAGE_WARN_PCT;
  const isDanger = pct >= STORAGE_DANGER_PCT;
  const barColor = isDanger ? 'var(--negative)' : isWarn ? 'var(--warn)' : 'var(--accent)';

  return (
    <div
      style={{
        marginBottom: 16,
        padding: '12px 16px',
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'var(--surface-2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
          브라우저 저장 공간
        </span>
        <span className="num" style={{ fontSize: 13, color: isWarn ? barColor : 'var(--text-3)' }}>
          {usageMB} MB / {quotaMB} MB ({pct.toFixed(1)}%)
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 3,
            width: `${pct}%`,
            background: barColor,
            transition: 'width 400ms ease',
          }}
        />
      </div>
      {isWarn && (
        <div style={{ marginTop: 8, fontSize: 12, color: barColor, fontWeight: 600 }}>
          {isDanger
            ? '⚠ 저장 공간이 거의 꽉 찼습니다. 데이터를 백업하고 일부를 삭제하세요.'
            : '⚠ 저장 공간이 70%를 넘었습니다. 정기적인 백업을 권장합니다.'}
        </div>
      )}
    </div>
  );
}
