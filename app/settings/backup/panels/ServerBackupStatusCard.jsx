'use client';
import { Icon } from '@/components/icons';
import { SettingTile } from '@/components/ui/SettingTile';
import { formatNumber, formatRelative } from '@/lib/format';
import {
  S_ALERT_ICON,
  S_ALERT_WRAP,
  S_HISTORY_EMPTY,
  formatBytes,
  importStatusLabel,
} from './backupPanelShared';
import {
  backupCountTile,
  backupListMessage,
  copyTile,
  dbTile,
  importJobsMessage,
  latestBackupTile,
  restoreVerifyTile,
  serverStatusErrors,
  verificationLabel,
} from './serverBackupView';

export function ServerBackupStatusCard({
  dbStatus,
  backupStatus,
  dbCheck,
  backupCheck,
  loading,
  creating,
  createError,
  onRefresh,
  onCreateBackup,
}) {
  const view = { dbStatus, backupStatus, dbCheck, backupCheck, loading };
  const recentImportJobs = dbStatus?.recentImportJobs || [];
  const listMessage = backupListMessage(view);
  const jobsMessage = importJobsMessage(view);

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
          <p style={{ fontSize: 12, color: 'var(--warn)', marginTop: 4, fontWeight: 700 }}>
            DB 백업에는 외부 로그인정보·법인카드와 로그인 인증 파일이 없습니다.
            로그인정보·법인카드는 백업 범위에서 [RND 업무]를 켜고 내려받아 [저장한 파일 확인]까지 해
            주세요. 화면 설정은 DB에 함께 보관합니다.
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

      {serverStatusErrors({ dbCheck, backupCheck, createError }).map(item => (
        <div key={item.label} style={{ ...S_ALERT_WRAP, marginBottom: 12 }}>
          <Icon.alert style={S_ALERT_ICON} />
          <span style={{ fontSize: 13 }}>
            <b>{item.label}:</b> {item.message}
          </span>
        </div>
      ))}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
          gap: 12,
        }}
      >
        <SettingTile label="PostgreSQL" {...dbTile(view)} />
        <SettingTile label="서버 백업" {...latestBackupTile(view)} />
        <SettingTile label="백업 파일" {...backupCountTile(view)} />
        <SettingTile label="복원 검증" {...restoreVerifyTile(view)} />
        <SettingTile label="다른 드라이브 사본" {...copyTile(view)} />
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
          {listMessage ? (
            <div style={S_HISTORY_EMPTY}>{listMessage}</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>파일</th>
                    <th style={{ width: 120, textAlign: 'right' }}>크기</th>
                    <th style={{ width: 170 }}>수정 시각</th>
                    <th style={{ width: 90 }}>복원 검증</th>
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
                      <td style={{ fontSize: 12 }}>{verificationLabel(backup.verification)}</td>
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
          {jobsMessage ? (
            <div style={S_HISTORY_EMPTY}>{jobsMessage}</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {recentImportJobs.map(job => (
                <div
                  key={`${job.startedAt || 'job'}-${job.status}`}
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
                    가져오기 · {formatNumber(job.rowCount || 0)}행 · store{' '}
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
