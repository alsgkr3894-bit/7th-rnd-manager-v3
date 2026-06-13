'use client';
import { MODULE_GROUPS } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { Toggle } from '@/components/ui/Toggle';

const chipStyle = active => ({
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 99,
  fontSize: 12,
  fontWeight: 700,
  background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
  color: active ? 'var(--accent-text)' : 'var(--text-3)',
});

/**
 * 복원 실행 섹션 (섹션 5): 자동백업 토글·확인 요약·진행률.
 *
 * @param {{
 *   busy: boolean,
 *   confirming: boolean,
 *   setConfirming: (v: boolean) => void,
 *   autoBackup: boolean,
 *   setAutoBackup: (fn: (v: boolean) => boolean) => void,
 *   backupFailed: boolean,
 *   setBackupFailed: (v: boolean) => void,
 *   restoreProgress: { label: string, current: number, total: number } | null,
 *   selectedKeys: string[],
 *   selectedRestoreStoreCount: number,
 *   ready: boolean,
 *   handleRestore: (skipBackupCheck: boolean) => Promise<void>,
 *   impact: object | null,
 *   dangerRows: object[],
 *   wipeRows: object[],
 * }} props
 */
export function RestoreExecutePanel({
  busy,
  confirming,
  setConfirming,
  autoBackup,
  setAutoBackup,
  backupFailed,
  setBackupFailed,
  restoreProgress,
  selectedKeys,
  selectedRestoreStoreCount,
  ready,
  handleRestore,
  impact,
  dangerRows,
  wipeRows,
}) {
  return (
    <div className="card" style={{ marginTop: 16, background: 'var(--negative-soft)' }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>5. 복원 실행</h2>

      {/* 자동 백업 옵션 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          borderBottom: '1px solid var(--border)',
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>복원 직전 자동 백업</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            복원 실행 직전에 현재 상태를 JSON으로 자동 다운로드합니다 (실수 시 되돌릴 수 있음)
          </div>
        </div>
        <Toggle value={autoBackup} onChange={() => setAutoBackup(v => !v)} />
      </div>

      {/* 확인 요약 박스 (confirming 상태) */}
      {confirming && (
        <div
          style={{
            padding: '14px 16px',
            marginBottom: 12,
            borderRadius: 8,
            background: 'color-mix(in oklab, var(--negative) 6%, var(--surface))',
            border: '1px solid color-mix(in oklab, var(--negative) 25%, transparent)',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 10,
              color: 'var(--negative)',
            }}
          >
            복원 실행 요약 — 계속하기 전에 확인하세요
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--text-3)', minWidth: 80, flexShrink: 0 }}>
                교체 모듈
              </span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {selectedKeys.map(k => (
                  <span key={k} style={chipStyle(true)}>
                    {MODULE_GROUPS[k]?.label || k}
                  </span>
                ))}
              </div>
            </div>
            {impact && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--text-3)', minWidth: 80, flexShrink: 0 }}>
                  데이터 규모
                </span>
                <span className="num" style={{ fontWeight: 700 }}>
                  현재 {formatNumber(impact.totalNow)}건 → 복원 후{' '}
                  {formatNumber(impact.totalAfter)}건
                  {impact.totalAfter < impact.totalNow && (
                    <span style={{ color: 'var(--negative)', marginLeft: 6 }}>
                      ({formatNumber(impact.totalAfter - impact.totalNow)}건)
                    </span>
                  )}
                </span>
              </div>
            )}
            {dangerRows.length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-3)', minWidth: 80, flexShrink: 0 }}>
                  위험 항목
                </span>
                <span style={{ color: 'var(--negative)', fontWeight: 700 }}>
                  ⚠ 데이터가 줄어드는 store {dangerRows.length}개
                  {wipeRows.length > 0 && ` (완전 삭제 ${wipeRows.length}개 포함)`}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--text-3)', minWidth: 80, flexShrink: 0 }}>
                자동 백업
              </span>
              {autoBackup ? (
                <span style={{ color: 'var(--positive)', fontWeight: 600 }}>
                  ✓ 복원 직전 현재 상태 백업 후 진행
                </span>
              ) : (
                <span style={{ color: 'var(--warn)', fontWeight: 600 }}>
                  ⚠ 자동 백업 없이 즉시 진행 (되돌리기 불가)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 자동백업 실패 재확인 박스 */}
      {backupFailed && (
        <div
          style={{
            padding: '12px 14px',
            marginBottom: 12,
            borderRadius: 8,
            background: 'var(--warn-soft)',
            border: '1px solid color-mix(in oklab, var(--warn) 30%, transparent)',
          }}
        >
          <div
            style={{ fontWeight: 700, fontSize: 13, color: 'var(--warn)', marginBottom: 6 }}
          >
            ⚠ 자동 백업에 실패했습니다
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-1)', marginBottom: 10 }}>
            복원 실패 시 되돌릴 수 없습니다. 백업 없이 복원을 계속 진행할까요?
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className="btn"
              onClick={() => {
                setBackupFailed(false);
                setConfirming(false);
              }}
            >
              취소
            </button>
            <button
              className="btn"
              onClick={() => {
                setBackupFailed(false);
                handleRestore(true);
              }}
              style={{
                background: 'var(--negative)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
              }}
            >
              백업 없이 복원
            </button>
          </div>
        </div>
      )}

      {/* 버튼 영역 */}
      {!confirming ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn"
            disabled={busy || selectedKeys.length === 0 || selectedRestoreStoreCount === 0}
            onClick={() => setConfirming(true)}
            style={{ color: 'var(--negative)', borderColor: 'var(--negative)' }}
          >
            복원 실행
          </button>
        </div>
      ) : (
        <div
          style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}
        >
          <button className="btn" disabled={busy} onClick={() => setConfirming(false)}>
            취소
          </button>
          <button
            className="btn"
            disabled={busy || !ready || selectedRestoreStoreCount === 0}
            onClick={() => handleRestore(false)}
            style={{
              background: 'var(--negative)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
            }}
          >
            {busy ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    marginRight: 6,
                    animation: 'spin 1s linear infinite',
                  }}
                >
                  ⟳
                </span>
                복원 중…
              </>
            ) : (
              `${selectedKeys.length}개 모듈 교체 복원`
            )}
          </button>
        </div>
      )}

      {/* 진행률 바 */}
      {busy && restoreProgress && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--surface-2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              fontSize: 12,
              color: 'var(--text-2)',
              marginBottom: 8,
            }}
          >
            <span style={{ fontWeight: 700 }}>{restoreProgress.label}</span>
            <span className="num">
              {formatNumber(Math.min(restoreProgress.current, restoreProgress.total))} /{' '}
              {formatNumber(restoreProgress.total)}
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              overflow: 'hidden',
              background: 'var(--surface-3)',
            }}
          >
            <div
              style={{
                width: `${Math.max(6, Math.min(100, (restoreProgress.current / Math.max(restoreProgress.total, 1)) * 100))}%`,
                height: '100%',
                background: 'var(--negative)',
                transition: 'width 180ms ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
