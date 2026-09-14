/**
 * app/settings/backup/panels/backupPanelShared.js — 백업 화면 패널 공용 스타일·포맷터
 */
import { formatNumber } from '@/lib/format';

export const S_ALERT_WRAP = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  borderRadius: 8,
  background: 'var(--warn-soft)',
  border: '1px solid color-mix(in oklab, var(--warn) 30%, transparent)',
};
export const S_ALERT_ICON = { width: 16, height: 16, flexShrink: 0, color: 'var(--warn)' };
export const S_HISTORY_EMPTY = {
  padding: '24px 0',
  textAlign: 'center',
  color: 'var(--text-3)',
  fontSize: 13,
};

export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0KB';
  if (value >= 1024 * 1024) return `${formatNumber(value / 1024 / 1024, 1)}MB`;
  return `${formatNumber(Math.ceil(value / 1024))}KB`;
}

export function formatBackupStatus(status) {
  if (!status) return '확인 중';
  if (status.stale) return '점검 필요';
  return '정상';
}

export function importStatusLabel(status) {
  const labels = {
    PENDING: '대기',
    RUNNING: '진행 중',
    COMPLETED: '완료',
    COMPLETED_WITH_WARNINGS: '완료(경고)',
    COMPLETED_WITH_ERRORS: '완료(오류)',
    FAILED: '실패',
  };
  return labels[status] || status || '-';
}
