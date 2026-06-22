'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { storesForScopes, MODULE_KEYS, collectStoreStats } from '@/lib/db';
import { useDBLoad } from '@/hooks/useDBLoad';
import { togglePin } from '@/lib/backup-history';
import { exportHistoryCsv } from './backupPageUtils';
import { useBackupActions } from './useBackupActions';
import { useBackupHistory } from './useBackupHistory';
import { useModuleScopes } from '@/hooks/useModuleScopes';
import { useDiagnostics } from '@/hooks/useDiagnostics';
import { getActiveBrand } from '@/lib/active-brand';
import {
  BackupBrandBanner,
  BackupReminderBanner,
  BackupSummaryTiles,
  BackupProgressBar,
  BackupScopeCard,
  BackupHistoryCard,
  BackupDiagnosticsCard,
} from './_BackupPagePanels';
import { ChangeHistoryPanel } from '@/components/change-log/ChangeHistoryPanel';

export default function Page() {
  const [activeBrand, setActiveBrand] = useState(null);
  const [busy, setBusy] = useState(false);
  const { scopes, toggleScope, setAllScopes } = useModuleScopes();
  const [backupProgress, setBackupProgress] = useState(null);

  const { data: stats } = useDBLoad(() => collectStoreStats(), {
    initialData: null,
    onError: err => {
      console.error('[Backup] DB 초기화 실패:', err);
      showToast('DB 초기화에 실패했습니다.', 'error');
    },
  });
  const ready = stats !== null;
  const { diagnostics, collectDiagnostics, collecting } = useDiagnostics();
  const backupProgressTimerRef = useRef(null);

  const {
    history,
    setHistory,
    historyQuery,
    setHistoryQuery,
    historyFilter,
    setHistoryFilter,
    filteredHistory,
    backupReminder,
    lastBackupAt,
    setLastBackupAt,
    refreshHistory,
  } = useBackupHistory();

  useEffect(() => {
    setActiveBrand(getActiveBrand());
  }, []);

  const selectedKeys = MODULE_KEYS.filter(k => scopes[k]);
  const selectedStores = storesForScopes(selectedKeys);
  const selectedRows = stats
    ? selectedStores.reduce((sum, name) => sum + (stats[name] || 0), 0)
    : 0;

  const { handleBackup } = useBackupActions({
    busy,
    setBusy,
    selectedKeys,
    selectedStores,
    selectedRows,
    setBackupProgress,
    backupProgressTimerRef,
    setHistory,
    setLastBackupAt,
  });

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['설정 / 백업', '데이터 백업']}
        title="데이터 백업"
        sub="원하는 모듈을 선택하여 JSON 파일로 다운로드 (사용자 PC에 저장)"
        actions={
          <button
            className="btn primary"
            disabled={!ready || busy || selectedKeys.length === 0}
            onClick={handleBackup}
          >
            {busy ? (
              <div
                className="report-loading-spinner"
                style={{ width: 14, height: 14, borderWidth: 2 }}
              />
            ) : (
              <Icon.download style={{ width: 14, height: 14 }} />
            )}
            {busy ? '준비 중…' : '백업 파일 다운로드'}
          </button>
        }
      />

      <BackupBrandBanner activeBrand={activeBrand} />
      <BackupReminderBanner backupReminder={backupReminder} />

      <BackupSummaryTiles
        lastBackupAt={lastBackupAt}
        selectedKeys={selectedKeys}
        selectedRows={selectedRows}
        ready={ready}
      />

      <BackupProgressBar backupProgress={backupProgress} />

      <BackupScopeCard
        ready={ready}
        stats={stats}
        scopes={scopes}
        onToggle={toggleScope}
        onSelectAll={() => setAllScopes(true)}
        onClearAll={() => setAllScopes(false)}
        selectedKeys={selectedKeys}
      />

      <BackupHistoryCard
        history={history}
        filteredHistory={filteredHistory}
        historyQuery={historyQuery}
        setHistoryQuery={setHistoryQuery}
        historyFilter={historyFilter}
        setHistoryFilter={setHistoryFilter}
        onExportCsv={() => exportHistoryCsv(filteredHistory)}
        onTogglePin={id => {
          togglePin(id);
          refreshHistory();
        }}
      />

      <BackupDiagnosticsCard
        diagnostics={diagnostics}
        collecting={collecting}
        onCollect={collectDiagnostics}
      />

      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>변경 이력</div>
        <ChangeHistoryPanel />
      </div>
    </main>
  );
}
