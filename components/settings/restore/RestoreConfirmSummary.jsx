import { formatNumber } from '@/lib/format';
import { RestoreModuleChip } from './RestoreModuleChip';

function SummaryRow({ label, children, align = 'flex-start' }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: align }}>
      <span style={{ color: 'var(--text-3)', minWidth: 80, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  );
}

export function RestoreConfirmSummary({
  selectedKeys,
  impact,
  dangerRows,
  wipeRows,
  autoBackup,
  busy,
  failedStoreCount,
  allowFailedStoreRestore,
  setAllowFailedStoreRestore,
}) {
  const hasFailedStores = failedStoreCount > 0;

  return (
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
        <SummaryRow label="교체 모듈">
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {selectedKeys.map(key => (
              <RestoreModuleChip key={key} moduleKey={key} />
            ))}
          </div>
        </SummaryRow>

        {impact && (
          <SummaryRow label="데이터 규모" align="center">
            <span className="num" style={{ fontWeight: 700 }}>
              현재 {formatNumber(impact.totalNow)}건 → 복원 후 {formatNumber(impact.totalAfter)}건
              {impact.totalAfter < impact.totalNow && (
                <span style={{ color: 'var(--negative)', marginLeft: 6 }}>
                  ({formatNumber(impact.totalAfter - impact.totalNow)}건)
                </span>
              )}
            </span>
          </SummaryRow>
        )}

        {dangerRows.length > 0 && (
          <SummaryRow label="위험 항목">
            <span style={{ color: 'var(--negative)', fontWeight: 700 }}>
              ⚠ 데이터가 줄어드는 store {dangerRows.length}개
              {wipeRows.length > 0 && ` (완전 삭제 ${wipeRows.length}개 포함)`}
            </span>
          </SummaryRow>
        )}

        {hasFailedStores && (
          <SummaryRow label="백업 오류">
            <label
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                padding: '8px 10px',
                borderRadius: 8,
                background: 'var(--warn-soft)',
                border: '1px solid color-mix(in oklab, var(--warn) 30%, transparent)',
                color: 'var(--warn)',
                fontWeight: 700,
              }}
            >
              <input
                type="checkbox"
                checked={allowFailedStoreRestore}
                onChange={event => setAllowFailedStoreRestore?.(event.target.checked)}
                disabled={busy}
                style={{ marginTop: 2 }}
              />
              <span>
                백업 생성 당시 읽기 실패 store {formatNumber(failedStoreCount)}개가 누락된 불완전
                백업임을 확인했고, 누락 store는 현재 데이터가 유지되는 조건으로 복원합니다.
              </span>
            </label>
          </SummaryRow>
        )}

        <SummaryRow label="자동 백업" align="center">
          {autoBackup ? (
            <span style={{ color: 'var(--positive)', fontWeight: 600 }}>
              ✓ 복원 직전 현재 상태 백업 후 진행
            </span>
          ) : (
            <span style={{ color: 'var(--warn)', fontWeight: 600 }}>
              ⚠ 자동 백업 없이 즉시 진행 (되돌리기 불가)
            </span>
          )}
        </SummaryRow>
      </div>
    </div>
  );
}
