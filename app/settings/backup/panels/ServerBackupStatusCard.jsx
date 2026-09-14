'use client';
import { Icon } from '@/components/icons';
import { SettingTile } from '@/components/ui/SettingTile';
import { formatNumber, formatRelative } from '@/lib/format';
import {
  S_ALERT_ICON,
  S_ALERT_WRAP,
  S_HISTORY_EMPTY,
  formatBackupStatus,
  formatBytes,
  importStatusLabel,
} from './backupPanelShared';

export function ServerBackupStatusCard({
  dbStatus,
  backupStatus,
  loading,
  creating,
  error,
  onRefresh,
  onCreateBackup,
}) {
  const latest = backupStatus?.latest;
  const dbOk = Boolean(dbStatus?.ok);
  const recentImportJobs = dbStatus?.recentImportJobs || [];

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>서버 DB / 자동 백업 상태</h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
            PostgreSQL 읽기 API와 로컬 .db-backups 폴더를 함께 확인합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn sm" onClick={onRefresh} disabled={loading || creating}>
            {loading ? '확인 중...' : '새로고침'}
          </button>
          <button
            className="btn sm primary"
            onClick={onCreateBackup}
            disabled={loading || creating}
          >
            {creating ? (
              <div
                className="report-loading-spinner"
                style={{ width: 13, height: 13, borderWidth: 2 }}
              />
            ) : (
              <Icon.download style={{ width: 13, height: 13 }} />
            )}
            {creating ? '생성 중' : '서버 백업 생성'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ ...S_ALERT_WRAP, marginBottom: 12 }}>
          <Icon.alert style={S_ALERT_ICON} />
          <span style={{ fontSize: 13 }}>
            <b>상태 확인 실패:</b> {error}
          </span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
          gap: 12,
        }}
      >
        <SettingTile
          label="PostgreSQL"
          value={loading && !dbStatus ? '확인 중' : dbOk ? '연결됨' : '오류'}
          sub={
            dbOk
              ? `${dbStatus.database || '-'} / ${formatNumber(dbStatus.counts?.storeRows || 0)}행`
              : '서버 DB 읽기 API 대기'
          }
        />
        <SettingTile
          label="서버 백업"
          value={loading && !backupStatus ? '확인 중' : formatBackupStatus(backupStatus)}
          sub={
            latest
              ? `${formatRelative(latest.modifiedAt)} · ${formatBytes(latest.size)}`
              : '아직 서버 백업 파일이 없습니다'
          }
        />
        <SettingTile
          label="백업 파일"
          value={`${formatNumber(backupStatus?.count || 0)}개`}
          sub={`${formatBytes(backupStatus?.totalSize || 0)} · ${backupStatus?.backupDir || '.db-backups'}`}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(min(280px,100%),1fr))',
          gap: 14,
          marginTop: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8 }}>
            자동/수동 백업 목록
          </div>
          {loading && !backupStatus ? (
            <div style={S_HISTORY_EMPTY}>서버 백업 목록 확인 중...</div>
          ) : !backupStatus?.backups?.length ? (
            <div style={S_HISTORY_EMPTY}>서버 백업 목록이 비어 있습니다.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>파일</th>
                    <th style={{ width: 120, textAlign: 'right' }}>크기</th>
                    <th style={{ width: 170 }}>수정 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {backupStatus.backups.slice(0, 6).map(backup => (
                    <tr key={backup.name}>
                      <td className="num" style={{ fontSize: 12 }}>
                        {backup.name}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {formatBytes(backup.size)}
                      </td>
                      <td className="num" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {new Date(backup.modifiedAt).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8 }}>
            최근 PostgreSQL 가져오기
          </div>
          {loading && !dbStatus ? (
            <div style={S_HISTORY_EMPTY}>PostgreSQL 작업 이력 확인 중...</div>
          ) : recentImportJobs.length === 0 ? (
            <div style={S_HISTORY_EMPTY}>최근 import 작업이 없습니다.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {recentImportJobs.map(job => (
                <div
                  key={job.id}
                  style={{
                    border: '1px solid var(--divider)',
                    borderRadius: 8,
                    padding: '9px 10px',
                    display: 'grid',
                    gap: 3,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <b style={{ fontSize: 12 }}>{importStatusLabel(job.status)}</b>
                    <span className="num" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {job.startedAt ? formatRelative(job.startedAt) : '-'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    {job.targetBrandId || '-'} · {formatNumber(job.rowCount || 0)}행 · store{' '}
                    {formatNumber(job.storeCount || 0)}개
                  </div>
                  {job.errorCount > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--warn)', fontWeight: 700 }}>
                      오류/경고 {formatNumber(job.errorCount)}건
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
