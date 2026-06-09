'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchBox } from '@/components/ui/SearchBox';
import { showToast } from '@/components/Toast';
import {
  initDB,
  exportSelected,
  storesForScopes,
  MODULE_GROUPS,
  MODULE_KEYS,
  collectStoreStats,
} from '@/lib/db';
import { downloadCsv, downloadJson, makeFileName } from '@/lib/download';
import { formatNumber, formatRelative } from '@/lib/format';
import {
  getHistory,
  addEntry,
  getLastBackupAt,
  togglePin,
  getBackupReminder,
} from '@/lib/backup-history';
import { SettingTile } from '@/components/ui/SettingTile';
import { useModuleScopes } from '@/hooks/useModuleScopes';
import { ModuleScopeList } from '@/components/settings/ModuleScopeList';
import { getActiveBrand } from '@/lib/active-brand';

/**
 * 데이터 백업 페이지
 *
 * 디자인 참고하되 브라우저 SPA 한계 반영:
 *   - 자동 백업/S3 저장/암호화 등은 외부 시스템 필요 → 제외
 *   - 마지막 백업 시각, 모듈 선택, 이력은 localStorage 기반
 */
export default function Page() {
  const [activeBrand, setActiveBrand] = useState(null); // SSR 불일치 방지 — 마운트 후 교정
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const { scopes, toggleScope, setAllScopes } = useModuleScopes();
  const [lastBackupAt, setLastBackupAt] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all'); // all | pinned | week
  const [backupProgress, setBackupProgress] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [backupReminder, setBackupReminder] = useState(null);
  const backupProgressTimerRef = useRef(null);

  useEffect(() => {
    setActiveBrand(getActiveBrand());
  }, []);

  useEffect(
    () => () => {
      if (backupProgressTimerRef.current) clearTimeout(backupProgressTimerRef.current);
    },
    []
  );

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        setReady(true);
        setStats(await collectStoreStats());
      } catch (err) {
        console.error('[Backup] DB 초기화 실패:', err);
        showToast('DB 초기화에 실패했습니다.', 'err');
      }
    })();
    setHistory(getHistory());
    setLastBackupAt(getLastBackupAt());
    setBackupReminder(getBackupReminder());
  }, []);

  // 선택된 모듈 키
  const selectedKeys = MODULE_KEYS.filter(k => scopes[k]);
  // 선택된 store 목록
  const selectedStores = storesForScopes(selectedKeys);
  // 선택된 행 수
  const selectedRows = stats
    ? selectedStores.reduce((sum, name) => sum + (stats[name] || 0), 0)
    : 0;

  const sortedHistory = useMemo(
    () =>
      [...history].sort((a, b) => {
        if (!a.pinned !== !b.pinned) return a.pinned ? -1 : 1;
        return (b.at || '').localeCompare(a.at || '');
      }),
    [history]
  );

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return sortedHistory.filter(h => {
      if (historyFilter === 'pinned' && !h.pinned) return false;
      if (historyFilter === 'week' && new Date(h.at).getTime() < weekAgo) return false;
      if (!q) return true;
      const scopeText = (h.scopes || []).map(k => MODULE_GROUPS[k]?.label || k).join(' ');
      return (
        String(h.id || '')
          .toLowerCase()
          .includes(q) ||
        String(h.fileName || '')
          .toLowerCase()
          .includes(q) ||
        scopeText.toLowerCase().includes(q)
      );
    });
  }, [historyFilter, historyQuery, sortedHistory]);

  function exportHistoryCsv() {
    const headers = ['백업 ID', '일시', '범위', '행 수', '파일명', '고정'];
    const rows = filteredHistory.map(h => [
      h.id || '',
      h.at ? new Date(h.at).toLocaleString('ko-KR') : '',
      (h.scopes || []).map(k => MODULE_GROUPS[k]?.label || k).join(', ') || '전체',
      h.totalRows ?? '',
      h.fileName || '',
      h.pinned ? 'Y' : '',
    ]);
    downloadCsv([headers, ...rows], '백업이력.csv');
  }

  async function collectDiagnostics() {
    const storage = navigator.storage?.estimate
      ? await navigator.storage.estimate().catch(() => null)
      : null;
    const nav = performance.getEntriesByType?.('navigation')?.[0];
    setDiagnostics({
      at: new Date().toLocaleString('ko-KR'),
      url: window.location.href,
      userAgent: navigator.userAgent,
      storageUsage: storage?.usage ?? null,
      storageQuota: storage?.quota ?? null,
      navigationType: nav?.type || 'unknown',
      loadMs: nav ? Math.round(nav.loadEventEnd || nav.duration || 0) : null,
    });
    showToast('진단 정보를 수집했어요', 'ok');
  }

  async function handleBackup() {
    if (busy || selectedKeys.length === 0) return;
    setBusy(true);
    setBackupProgress({
      label: '백업 준비 중',
      current: 0,
      total: Math.max(selectedStores.length, 1),
    });
    try {
      const data = await exportSelected(
        selectedStores,
        { scopes: selectedKeys },
        {
          onProgress: ({ store, index, total }) => {
            setBackupProgress({ label: `${store} 내보내는 중`, current: index, total });
          },
        }
      );
      const fileName = makeFileName('rnd-manager-backup', 'json');
      setBackupProgress({
        label: '파일 다운로드 준비 중',
        current: Math.max(selectedStores.length, 1),
        total: Math.max(selectedStores.length, 1),
      });
      downloadJson(data, fileName);
      // 이력 기록 (실패해도 백업 파일은 이미 다운로드됨 — 경고만)
      const recorded = addEntry({
        scopes: selectedKeys,
        totalRows: selectedRows,
        fileName,
      });
      setHistory(getHistory());
      setLastBackupAt(getLastBackupAt());
      showToast(`백업 완료 — ${fileName}`, 'ok');
      if (!recorded) {
        showToast(
          '백업 이력 저장에 실패했어요 (저장 공간 부족). 백업 파일은 정상 다운로드되었습니다.',
          'warn'
        );
      }
    } catch (err) {
      console.error('[Backup] 실패:', err);
      showToast('백업 중 오류가 발생했습니다.', 'err');
    } finally {
      setBusy(false);
      if (backupProgressTimerRef.current) clearTimeout(backupProgressTimerRef.current);
      backupProgressTimerRef.current = setTimeout(() => {
        setBackupProgress(null);
        backupProgressTimerRef.current = null;
      }, 900);
    }
  }

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

      {/* 현재 브랜드 안내 — 노트(공유DB)는 항상 7번가피자에서 백업해야 포함됨 */}
      <div style={{ minHeight: 44, marginTop: 12 }}>
        {activeBrand && activeBrand.id !== 'main' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--warn-soft)',
              border: '1px solid color-mix(in oklab, var(--warn) 30%, transparent)',
            }}
          >
            <Icon.alert style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--warn)' }} />
            <span style={{ fontSize: 13 }}>
              <b>현재 브랜드: {activeBrand.name}</b>
              <span style={{ color: 'var(--warn)', fontWeight: 700 }}>
                {' '}
                — 개발노트·샘플기록은 7번가피자 DB에 저장됩니다. 노트를 백업하려면 7번가피자로 전환
                후 백업하세요.
              </span>
            </span>
          </div>
        )}
      </div>

      {/* 백업 리마인더 */}
      {backupReminder?.stale && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 8,
            marginTop: 12,
            background: 'var(--warn-soft)',
            border: '1px solid color-mix(in oklab, var(--warn) 30%, transparent)',
          }}
        >
          <Icon.alert style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--warn)' }} />
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
      )}

      {/* 요약 카드 */}
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
            lastBackupAt
              ? new Date(lastBackupAt).toLocaleString('ko-KR')
              : '아직 백업하지 않았습니다'
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

      {backupProgress && (
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
      )}

      {/* 백업 범위 선택 */}
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
            <button className="btn sm" onClick={() => setAllScopes(true)} disabled={!ready}>
              전체 선택
            </button>
            <button className="btn sm" onClick={() => setAllScopes(false)} disabled={!ready}>
              모두 해제
            </button>
          </div>
        </div>

        <ModuleScopeList
          scopes={scopes}
          onToggle={toggleScope}
          disabled={!ready}
          getCountLabel={(key, g) => {
            const count = stats ? g.stores.reduce((s, n) => s + (stats[n] || 0), 0) : 0;
            return `${formatNumber(count)}건`;
          }}
        />
      </div>

      {/* 최근 백업 이력 */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>최근 백업 이력</h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
          이 브라우저에서 실행한 백업 기록입니다. 실제 백업 파일은 다운로드한 위치에 저장되어
          있습니다.
        </p>

        {history.length === 0 ? (
          <div
            style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}
          >
            아직 백업 이력이 없습니다.
          </div>
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
                onClick={exportHistoryCsv}
                disabled={filteredHistory.length === 0}
              >
                CSV
              </button>
            </div>
            {filteredHistory.length === 0 ? (
              <div
                style={{
                  padding: '24px 0',
                  textAlign: 'center',
                  color: 'var(--text-3)',
                  fontSize: 13,
                }}
              >
                조건에 맞는 백업 이력이 없습니다.
              </div>
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
                            onClick={() => {
                              togglePin(h.id);
                              setHistory(getHistory());
                            }}
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

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>개발 서버 진단</h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
          로컬 점검 중 서버 연결이 끊길 때 브라우저 환경 정보를 빠르게 남깁니다.
        </p>
        <button className="btn sm" onClick={collectDiagnostics}>
          진단 정보 수집
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
    </main>
  );
}
