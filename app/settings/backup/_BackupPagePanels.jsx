'use client';
import { Icon } from '@/components/icons';
import { SearchBox } from '@/components/ui/SearchBox';
import { SettingTile } from '@/components/ui/SettingTile';
import { ModuleScopeList } from '@/components/settings/ModuleScopeList';
import { formatNumber, formatRelative } from '@/lib/format';
import { MODULE_GROUPS, MODULE_KEYS } from '@/lib/db';

const S_ALERT_WRAP = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  borderRadius: 8,
  background: 'var(--warn-soft)',
  border: '1px solid color-mix(in oklab, var(--warn) 30%, transparent)',
};
const S_ALERT_ICON = { width: 16, height: 16, flexShrink: 0, color: 'var(--warn)' };
const S_HISTORY_EMPTY = {
  padding: '24px 0',
  textAlign: 'center',
  color: 'var(--text-3)',
  fontSize: 13,
};

export function BackupBrandBanner({ activeBrand }) {
  if (!activeBrand || activeBrand.id === 'main')
    return <div style={{ minHeight: 44, marginTop: 12 }} />;
  return (
    <div style={{ minHeight: 44, marginTop: 12 }}>
      <div style={S_ALERT_WRAP}>
        <Icon.alert style={S_ALERT_ICON} />
        <span style={{ fontSize: 13 }}>
          <b>현재 브랜드: {activeBrand.name}</b>
          <span style={{ color: 'var(--warn)', fontWeight: 700 }}>
            {' '}
            — 개발노트·샘플기록은 7번가피자 DB에 저장됩니다. 노트를 백업하려면 7번가피자로 전환 후
            백업하세요.
          </span>
        </span>
      </div>
    </div>
  );
}

export function BackupReminderBanner({ backupReminder }) {
  if (!backupReminder?.stale) return null;
  return (
    <div style={{ ...S_ALERT_WRAP, marginTop: 12 }}>
      <Icon.alert style={S_ALERT_ICON} />
      <span style={{ fontSize: 13 }}>
        {backupReminder.never ? (
          <>
            <b>아직 백업하지 않았어요.</b> 데이터를 정기적으로 백업해 두세요.
          </>
        ) : (
          <>
            <b>마지막 백업 후 {backupReminder.daysSince}일이 지났어요.</b> 최신 데이터를 백업해
            두세요.
          </>
        )}
      </span>
    </div>
  );
}

export function BackupSummaryTiles({ lastBackupAt, selectedKeys, selectedRows, ready }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
        gap: 16,
        marginTop: 8,
      }}
    >
      <SettingTile
        label="마지막 백업"
        value={lastBackupAt ? formatRelative(lastBackupAt) : '없음'}
        sub={
          lastBackupAt ? new Date(lastBackupAt).toLocaleString('ko-KR') : '아직 백업하지 않았습니다'
        }
      />
      <SettingTile
        label="선택된 모듈"
        value={`${selectedKeys.length} / ${MODULE_KEYS.length}`}
        sub={selectedKeys.map(k => MODULE_GROUPS[k].label).join(' · ') || '선택된 항목 없음'}
      />
      <SettingTile
        label="선택된 데이터"
        value={`${formatNumber(selectedRows)}건`}
        sub={ready ? '백업 파일 예상 크기는 데이터에 따라 다릅니다' : 'DB 초기화 중…'}
        num
      />
    </div>
  );
}

export function BackupProgressBar({ backupProgress }) {
  if (!backupProgress) return null;
  return (
    <div className="card" style={{ marginTop: 16, padding: '14px 18px' }} aria-live="polite">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 13,
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 700 }}>{backupProgress.label}</span>
        <span className="num" style={{ color: 'var(--text-3)' }}>
          {backupProgress.current} / {backupProgress.total}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 99,
          background: 'var(--surface-2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.round((backupProgress.current / Math.max(backupProgress.total, 1)) * 100))}%`,
            height: '100%',
            background: 'var(--accent)',
            transition: 'width .15s ease',
          }}
        />
      </div>
    </div>
  );
}

export function BackupScopeCard({
  ready,
  stats,
  scopes,
  onToggle,
  onSelectAll,
  onClearAll,
  selectedKeys,
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>백업 범위</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            포함할 모듈을 선택하세요. 공통 설정·업로드 로그는 항상 포함됩니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm" onClick={onSelectAll} disabled={!ready}>
            전체 선택
          </button>
          <button className="btn sm" onClick={onClearAll} disabled={!ready}>
            모두 해제
          </button>
        </div>
      </div>

      <ModuleScopeList
        scopes={scopes}
        onToggle={onToggle}
        disabled={!ready}
        getCountLabel={(key, g) => {
          const count = stats ? g.stores.reduce((s, n) => s + (stats[n] || 0), 0) : 0;
          return `${formatNumber(count)}건`;
        }}
      />
    </div>
  );
}

export function BackupHistoryCard({
  history,
  filteredHistory,
  historyQuery,
  setHistoryQuery,
  historyFilter,
  setHistoryFilter,
  onExportCsv,
  onTogglePin,
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>최근 백업 이력</h2>
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
        이 브라우저에서 실행한 백업 기록입니다. 실제 백업 파일은 다운로드한 위치에 저장되어
        있습니다.
      </p>

      {history.length === 0 ? (
        <div style={S_HISTORY_EMPTY}>아직 백업 이력이 없습니다.</div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: '1 1 260px' }}>
              <SearchBox
                value={historyQuery}
                onChange={setHistoryQuery}
                placeholder="백업 ID·범위·파일명 검색"
              />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { key: 'all', label: '전체' },
                { key: 'pinned', label: '고정' },
                { key: 'week', label: '최근 7일' },
              ].map(f => (
                <button
                  key={f.key}
                  className={'chip' + (historyFilter === f.key ? ' active' : '')}
                  onClick={() => setHistoryFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              className="btn sm"
              onClick={onExportCsv}
              disabled={filteredHistory.length === 0}
            >
              엑셀로 내보내기
            </button>
          </div>
          {filteredHistory.length === 0 ? (
            <div style={S_HISTORY_EMPTY}>조건에 맞는 백업 이력이 없습니다.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }} />
                    <th style={{ width: 120 }}>백업 ID</th>
                    <th style={{ width: 170 }}>일시</th>
                    <th>범위</th>
                    <th style={{ width: 100, textAlign: 'right' }}>행 수</th>
                    <th>파일명</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map(h => (
                    <tr
                      key={h.id}
                      style={h.pinned ? { background: 'var(--accent-soft)' } : undefined}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn sm"
                          title={h.pinned ? '고정 해제' : '고정(20건 초과 시에도 보존)'}
                          aria-pressed={h.pinned}
                          onClick={() => onTogglePin(h.id)}
                          style={{
                            padding: '2px 6px',
                            color: h.pinned ? 'var(--accent)' : 'var(--text-4)',
                          }}
                        >
                          {h.pinned ? '📌' : '📍'}
                        </button>
                      </td>
                      <td className="num" style={{ color: 'var(--text-3)', fontSize: 12 }}>
                        {h.id}
                      </td>
                      <td className="num" style={{ fontSize: 12 }}>
                        {new Date(h.at).toLocaleString('ko-KR')}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {(h.scopes || []).map(k => MODULE_GROUPS[k]?.label || k).join(', ') ||
                          '전체'}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {formatNumber(h.totalRows)}
                      </td>
                      <td className="num" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {h.fileName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

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
