'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { getActiveBrandId } from '@/lib/active-brand';
import { collectStoreStats } from '@/lib/db';
import {
  SYNC_MODE,
  hasSyncModeOverride,
  resolveSyncMode,
  setSyncModeOverride,
} from '@/lib/db/sync-mode';
import {
  hydrateFromServer,
  readHydrateJournal,
  readServerManifest,
} from '@/lib/db/server-hydrate';
import { formatNumber } from '@/lib/format';

function ModeBadge({ mode }) {
  const readonly = mode === SYNC_MODE.READONLY;
  return (
    <span
      className="chip"
      style={{
        background: readonly ? 'var(--surface-2)' : 'var(--accent-soft)',
        color: readonly ? 'var(--text-2)' : 'var(--accent-text)',
        fontWeight: 800,
      }}
    >
      {readonly ? '읽기 전용 (LAN)' : '운영 PC (쓰기 동기화 켜짐)'}
    </span>
  );
}

function StatRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
      <span style={{ color: 'var(--text-3)' }}>{label}</span>
      <span className="num" style={{ fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}

export default function ServerSyncPage() {
  const [mode, setMode] = useState(SYNC_MODE.AUTHORITATIVE);
  const [overridden, setOverridden] = useState(false);
  const [brandId, setBrandId] = useState('main');
  const [manifest, setManifest] = useState(null);
  const [localStats, setLocalStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [journal, setJournal] = useState(null);

  const isReadonly = mode === SYNC_MODE.READONLY;

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const activeBrand = getActiveBrandId();
    setBrandId(activeBrand);
    try {
      const [serverManifest, stats] = await Promise.all([
        readServerManifest(activeBrand),
        collectStoreStats().catch(() => ({})),
      ]);
      setManifest(serverManifest);
      setLocalStats(stats || {});
    } catch (error) {
      console.error('[settings/sync] 서버 조회 실패', error);
      setLoadError(error?.message || '서버에 연결하지 못했습니다.');
      setManifest(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMode(resolveSyncMode());
    setOverridden(hasSyncModeOverride());
    setJournal(readHydrateJournal());
    refresh();
  }, [refresh]);

  const rows = useMemo(() => {
    const serverStores = manifest?.stores || [];
    return serverStores.map(entry => ({
      ...entry,
      localRows: localStats[entry.storeName] || 0,
    }));
  }, [manifest, localStats]);

  function toggleOverride() {
    const next = isReadonly ? SYNC_MODE.AUTHORITATIVE : SYNC_MODE.READONLY;
    if (!setSyncModeOverride(next)) {
      showToast('모드를 저장하지 못했습니다', 'error');
      return;
    }
    setMode(resolveSyncMode());
    setOverridden(hasSyncModeOverride());
    showToast('모드를 변경했습니다. 새로고침하면 전체 화면에 반영됩니다.', 'ok');
  }

  function clearOverride() {
    setSyncModeOverride(null);
    setMode(resolveSyncMode());
    setOverridden(false);
    showToast('자동 판정으로 되돌렸습니다', 'ok');
  }

  async function handleHydrate() {
    if (running) return;
    // 운영 PC에서 실행하면 서버의 낡은 상태로 로컬 원본을 덮어쓸 수 있다.
    if (!isReadonly) {
      const ok = window.confirm(
        '이 PC는 운영 PC(쓰기 동기화 켜짐)로 판정됐습니다.\n' +
          '서버에서 불러오면 이 PC의 로컬 데이터가 서버 내용으로 덮어써집니다.\n\n' +
          '정말 진행할까요?'
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(
        '서버 데이터로 이 PC의 로컬 데이터를 덮어씁니다.\n이 PC에서 따로 입력한 내용은 사라집니다.\n\n진행할까요?'
      );
      if (!ok) return;
    }

    setRunning(true);
    setProgress({ phase: 'start' });
    try {
      const result = await hydrateFromServer(brandId, { onProgress: setProgress });
      setJournal(result);
      if (result.ok) {
        showToast(`서버 데이터 ${formatNumber(result.totalRows)}건을 불러왔습니다`, 'ok');
      } else {
        showToast(`일부 실패: ${result.failed.map(f => f.storeName).join(', ')}`, 'warn');
      }
      await refresh();
    } catch (error) {
      console.error('[settings/sync] 하이드레이션 실패', error);
      showToast(error?.message || '서버 데이터를 불러오지 못했습니다', 'error');
    } finally {
      setRunning(false);
    }
  }

  const plannedRows = progress?.plannedRows || manifest?.totalRows || 0;
  const doneRows = progress?.totalRows || 0;
  const pct = plannedRows > 0 ? Math.min(100, Math.round((doneRows / plannedRows) * 100)) : 0;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['설정 / 백업', '서버 데이터 불러오기']}
        title="서버 데이터 불러오기"
        sub="운영 PC의 서버 DB에 쌓인 데이터를 이 브라우저로 내려받아 같은 내용을 봅니다."
        actions={
          <button className="btn" type="button" onClick={refresh} disabled={loading || running}>
            새로고침
          </button>
        }
      />

      <section className="card" style={{ marginTop: 18, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="card-title" style={{ margin: 0 }}>
            이 브라우저의 모드
          </div>
          <ModeBadge mode={mode} />
          {overridden && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>수동 지정됨</span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn sm" type="button" onClick={toggleOverride}>
              {isReadonly ? '운영 PC로 지정' : '읽기 전용으로 지정'}
            </button>
            {overridden && (
              <button className="btn sm" type="button" onClick={clearOverride}>
                자동 판정
              </button>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
          {isReadonly ? (
            <>
              이 브라우저는 서버로 아무것도 저장하지 않습니다. 여기서 입력·수정한 내용은 이
              PC에만 남고, 다시 불러오면 사라집니다. 데이터 수정은 운영 PC에서 해주세요.
            </>
          ) : (
            <>
              이 브라우저의 변경 사항은 서버 DB에 자동 저장됩니다. 다른 PC는 이 데이터를
              내려받아 보게 됩니다.
            </>
          )}
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <div>
            <div className="card-title" style={{ margin: 0 }}>
              서버 · 로컬 비교
            </div>
            <div className="card-sub">브랜드 {brandId}</div>
          </div>
          <button
            className="btn primary"
            type="button"
            onClick={handleHydrate}
            disabled={running || loading || !manifest || (manifest.totalRows || 0) === 0}
          >
            {running ? '불러오는 중…' : '서버에서 불러오기'}
          </button>
        </div>

        {loadError && (
          <div
            style={{
              border: '1px solid var(--negative)',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 13,
              color: 'var(--negative)',
              marginBottom: 12,
            }}
          >
            서버에 연결하지 못했습니다 — {loadError}
            <div style={{ color: 'var(--text-3)', marginTop: 6, fontSize: 12 }}>
              운영 PC의 서버가 켜져 있는지, LAN 접속이 허용됐는지(RND_ALLOW_LAN) 확인해주세요.
            </div>
          </div>
        )}

        {running && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: 'var(--surface-2)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  transition: 'width .2s',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
              {progress?.storeName ? `${progress.storeName} · ` : ''}
              {formatNumber(doneRows)} / {formatNumber(plannedRows)}건
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>
            서버에 저장된 데이터가 없습니다.
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <StatRow label="서버 총 행" value={formatNumber(manifest.totalRows)} />
              <StatRow label="스토어" value={formatNumber(rows.length)} />
              <StatRow
                label="무시된 중복"
                value={formatNumber(manifest.totalForkedRows || 0)}
              />
            </div>
            <div className="paper-table-scroll" style={{ overflowX: 'auto' }}>
              <table className="paper-table">
                <thead>
                  <tr>
                    <th>스토어</th>
                    <th style={{ width: 90, textAlign: 'right' }}>서버</th>
                    <th style={{ width: 90, textAlign: 'right' }}>이 PC</th>
                    <th style={{ width: 90, textAlign: 'right' }}>차이</th>
                    <th style={{ width: 90, textAlign: 'right' }}>무시된 중복</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const diff = row.rows - row.localRows;
                    return (
                      <tr key={row.storeName}>
                        <td>
                          {row.storeName}
                          {row.shared && (
                            <span
                              className="chip"
                              style={{ marginLeft: 6, fontSize: 10 }}
                            >
                              공용
                            </span>
                          )}
                        </td>
                        <td className="num" style={{ textAlign: 'right' }}>
                          {formatNumber(row.rows)}
                        </td>
                        <td className="num" style={{ textAlign: 'right' }}>
                          {formatNumber(row.localRows)}
                        </td>
                        <td
                          className="num"
                          style={{
                            textAlign: 'right',
                            color: diff === 0 ? 'var(--text-3)' : 'var(--accent-text)',
                          }}
                        >
                          {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${formatNumber(diff)}`}
                        </td>
                        <td
                          className="num"
                          style={{
                            textAlign: 'right',
                            color: row.forkedRows > 0 ? 'var(--negative)' : 'var(--text-3)',
                          }}
                        >
                          {row.forkedRows > 0 ? formatNumber(row.forkedRows) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-title">마지막 불러오기</div>
        {journal ? (
          <div style={{ display: 'grid', gap: 6, fontSize: 13, marginTop: 8 }}>
            <StatRow label="시각" value={journal.finishedAt || '—'} />
            <StatRow label="브랜드" value={journal.brandId || '—'} />
            <StatRow label="적용 행" value={formatNumber(journal.totalRows || 0)} />
            <StatRow
              label="결과"
              value={journal.ok ? '성공' : `실패 ${journal.failed?.length || 0}건`}
            />
            {journal.failed?.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--negative)' }}>
                실패: {journal.failed.map(f => f.storeName).join(', ')}
              </div>
            )}
            {journal.skipped?.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                건너뜀: {journal.skipped.map(s => s.storeName).join(', ')}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 8 }}>
            아직 불러온 적이 없습니다.
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-title">알아두기</div>
        <ul
          style={{
            margin: '8px 0 0',
            paddingLeft: 18,
            fontSize: 12,
            color: 'var(--text-3)',
            lineHeight: 1.8,
          }}
        >
          <li>불러오기는 이 PC의 로컬 데이터를 서버 내용으로 <b>덮어씁니다</b>.</li>
          <li>서버 데이터는 그 시점의 사본입니다. 최신 내용을 보려면 다시 불러와야 합니다.</li>
          <li>
            브랜드 목록과 화면 설정(테마·필터·출력 옵션 등)은 브라우저에만 저장되어 함께
            내려오지 않습니다. 이 PC에서 처음 보는 화면은 기본값으로 표시될 수 있습니다.
          </li>
          <li>
            &quot;무시된 중복&quot;은 과거에 여러 브라우저가 같은 항목을 각자 올려서 서버가
            갈라 놓은 행입니다. 불러올 때 제외됩니다.
          </li>
        </ul>
      </section>
    </main>
  );
}
