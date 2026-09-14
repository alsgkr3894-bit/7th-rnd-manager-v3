'use client';
import { formatNumber } from '@/lib/format';

export function BackupDiagnosticsCard({ diagnostics, collecting, onCollect }) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>개발 서버 진단</h2>
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
        로컬 점검 중 서버 연결이 끊길 때 브라우저 환경 정보를 빠르게 남깁니다.
      </p>
      <button className="btn sm" onClick={onCollect} disabled={collecting}>
        {collecting ? '수집 중...' : '진단 정보 수집'}
      </button>
      {diagnostics && (
        <div
          style={{ marginTop: 12, display: 'grid', gap: 6, fontSize: 12, color: 'var(--text-2)' }}
        >
          <div>
            <b>수집 시각</b> {diagnostics.at}
          </div>
          <div>
            <b>URL</b> <span className="mono">{diagnostics.url}</span>
          </div>
          <div>
            <b>로드 유형</b> {diagnostics.navigationType}
            {diagnostics.loadMs != null ? ` · ${diagnostics.loadMs}ms` : ''}
          </div>
          <div>
            <b>저장소</b>{' '}
            {diagnostics.storageUsage != null
              ? `${formatNumber(Math.round(diagnostics.storageUsage / 1024))}KB / ${formatNumber(Math.round((diagnostics.storageQuota || 0) / 1024))}KB`
              : '확인 불가'}
          </div>
          <div style={{ wordBreak: 'break-word' }}>
            <b>User Agent</b> {diagnostics.userAgent}
          </div>
        </div>
      )}
    </div>
  );
}
