'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { importAll, MODULE_KEYS, storesForScopes, collectStoreStats, exportAll } from '@/lib/db';
import { useDBLoad } from '@/hooks/useDBLoad';
import { downloadJson, makeFileName } from '@/lib/download';
import { addEntry } from '@/lib/backup-history';
import { pickRestoreStores } from '@/lib/backup/restore-impact';
import { formatNumber } from '@/lib/format';
import { useModuleScopes } from '@/hooks/useModuleScopes';
import { useRestoreImpact } from '@/hooks/useRestoreImpact';
import { useRestoreFile } from '@/hooks/useRestoreFile';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { getActiveBrand } from '@/lib/active-brand';
import { pickLocalStorageForScopes } from '@/lib/backup/local-storage-keys';
import { RestoreDoneCard } from '@/components/settings/restore/RestoreDoneCard';
import { RestorePreview } from '@/components/settings/restore/RestorePreview';
import { RestoreExecutePanel } from '@/components/settings/restore/RestoreExecutePanel';

const SHARED_SKIP_STORE = '__shared_skipped__';

/**
 * 데이터 복원 페이지
 *
 * 흐름:
 *   1. 파일 선택 → JSON 파싱·검증
 *   2. 미리보기 (백업 메타 + schema 경고)
 *   3. 복원 범위 선택 + 선택 요약
 *   4. 예상 변경 사항 (위험 store 강조)
 *   5. 실행 — 자동백업 토글 → 확인 요약 박스 → 최종 버튼 → 진행률
 *   6. 완료 상태 카드 (alert 없이 인라인)
 */
export default function Page() {
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canRestore = roleReady && isAdmin;
  // SSR/클라이언트 불일치 방지 — 마운트 후 활성 브랜드 읽기
  const [activeBrand, setActiveBrand] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [restoreProgress, setRestoreProgress] = useState(null); // { label, current, total }
  const [restoreDone, setRestoreDone] = useState(null); // 완료 결과: { imported, skipped, modules }
  const [backupFailed, setBackupFailed] = useState(false); // 자동백업 실패 후 재확인 대기
  const [allowFailedStoreRestore, setAllowFailedStoreRestore] = useState(false);
  const { scopes, toggleScope, setAllScopes } = useModuleScopes();
  const fileRef = useRef(null);

  const { parsed, setParsed, handleFile } = useRestoreFile({
    onReset: () => {
      setConfirming(false);
      setRestoreDone(null);
      setBackupFailed(false);
      setAllowFailedStoreRestore(false);
    },
  });

  // DB store 통계 로드 — ready와 currentStats 공동 원천
  const { data: currentStats, reload: reloadStats } = useDBLoad(() => collectStoreStats(), {
    initialData: null,
    onError: err => {
      console.error('[Restore] DB 초기화 실패:', err);
      showToast('DB 초기화에 실패했습니다.', 'error');
    },
  });
  const ready = currentStats !== null;

  useEffect(() => {
    setActiveBrand(getActiveBrand());
  }, []);

  const selectedKeys = MODULE_KEYS.filter(k => scopes[k]);
  const selectedStores = storesForScopes(selectedKeys);

  const { impact, unchangedSelectedStores, dangerRows, wipeRows } = useRestoreImpact(
    parsed,
    currentStats,
    selectedStores
  );

  const selectedRestoreStoreCount = impact?.storeCount ?? 0;
  const failedStoreCount = parsed?._failedStores?.length ?? 0;
  const hasFailedStores = failedStoreCount > 0;

  async function handleRestore(skipBackupCheck = false) {
    if (!parsed || busy) return;
    if (!canRestore) {
      showToast(roleReady ? '관리자 권한이 필요합니다' : '권한 확인 중입니다', 'error');
      return;
    }
    if (hasFailedStores && !allowFailedStoreRestore) {
      setConfirming(true);
      showToast('백업 생성 실패 store가 있어 위험 승인 체크가 필요합니다.', 'warn', 7000);
      return;
    }
    setBusy(true);
    setRestoreProgress({
      label: '복원 준비 중',
      current: 0,
      total: Math.max(selectedStores.length, 1),
    });
    try {
      // 1) 복원 직전 자동 백업
      if (autoBackup && !skipBackupCheck) {
        try {
          setRestoreProgress({
            label: '자동 백업 생성 중',
            current: 0,
            total: Math.max(selectedStores.length, 1),
          });
          const backup = await exportAll();
          const fileName = makeFileName('복원용임시백업파일', 'json');
          downloadJson(backup, fileName);
          addEntry({
            scopes: MODULE_KEYS,
            totalRows: Object.values(currentStats || {}).reduce((s, n) => s + n, 0),
            fileName,
          });
          showToast(`자동 백업 완료 — ${fileName}`, 'ok');
        } catch (bkErr) {
          console.error('[Restore] 자동 백업 실패:', bkErr);
          // 자동백업 실패 → 복원 중단하고 재확인 요구
          setBusy(false);
          setRestoreProgress(null);
          setBackupFailed(true);
          return;
        }
      }

      // 2) 선택된 모듈의 store와 해당 모듈의 영속 localStorage 설정만 import
      const partialData = {
        ...parsed,
        stores: pickRestoreStores(parsed.stores, selectedStores),
        localStorage: pickLocalStorageForScopes(parsed.localStorage, selectedKeys),
      };
      const restoreTotal = Object.keys(partialData.stores).length || 1;
      setRestoreProgress({ label: 'store 복원 시작', current: 0, total: restoreTotal });
      const result = await importAll(partialData, {
        onProgress: ({ store, index, total }) => {
          const rowCount = Array.isArray(partialData.stores?.[store])
            ? partialData.stores[store].length
            : 0;
          const label =
            rowCount > 500
              ? `${store} 복원 중 (${formatNumber(rowCount)}건, 청크 분할)`
              : `${store} 복원 중`;
          setRestoreProgress({ label, current: index, total });
        },
      });
      const { imported, skipped, errors } = result || {};
      const restoreErrors = Array.isArray(errors) ? errors : [];
      const realErrors = restoreErrors.filter(e => e?.store !== SHARED_SKIP_STORE);
      const sharedSkip = restoreErrors.find(e => e?.store === SHARED_SKIP_STORE);

      if (realErrors.length > 0) {
        const partial = realErrors.find(e => e?.store === '__partial__');
        if (partial) {
          showToast(
            `⚠ 복원이 중단되었습니다 — DB가 불일치 상태일 수 있습니다. ` +
              `'시스템 설정 → DB 완전 재생성' 후 백업을 다시 복원하세요. (${partial.error})`,
            'warn',
            9000
          );
        } else {
          showToast(
            `복원 일부 완료 — 성공 ${imported}개 / 건너뜀 ${skipped}개. ` +
              `'시스템 설정 → DB 완전 재생성' 후 다시 시도하면 전체 복원됩니다.`,
            'warn'
          );
        }
        console.warn('[Restore] 일부 실패:', restoreErrors);
      } else if (sharedSkip) {
        showToast(sharedSkip.error, 'ok', 7000);
      }

      // 작업 로그 — 복원 이벤트
      import('@/lib/work-log')
        .then(m =>
          m.logWork(
            'RESTORE',
            `복원 ${imported}개 store (${selectedKeys.length}개 모듈)${skipBackupCheck ? ' · 자동백업 없이' : ''}`
          )
        )
        // 복원 성공 후 work-log 기록 실패는 무시한다.
        // 복원 자체는 이미 완료됐으므로 사용자에게 노출할 필요 없는 background 처리.
        .catch(() => {});

      // 완료 상태로 전환 — alert·자동 reload 없이 인라인 카드
      setRestoreDone({
        imported,
        skipped: skipped ?? 0,
        errors: restoreErrors,
        modules: selectedKeys,
        backupSkipped: skipBackupCheck,
      });
      setParsed(null);
      setConfirming(false);
      if (fileRef.current) fileRef.current.value = '';
      reloadStats();
    } catch (err) {
      console.error('[Restore] 복원 실패:', err);
      const isSchemaIssue = String(err.message || '').includes('object stores was not found');
      showToast(
        '복원 중 오류: ' +
          err.message +
          (isSchemaIssue ? ' (해결: 시스템 설정 → 위험 영역 → "DB 완전 재생성")' : ''),
        'error'
      );
    } finally {
      setBusy(false);
      setRestoreProgress(null);
    }
  }

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['설정 / 백업', '데이터 복원']}
        title="데이터 복원"
        sub="백업 시점으로 데이터를 되돌립니다. 복원은 되돌릴 수 없으니 신중히 진행하세요."
      />

      {/* ── 현재 브랜드 안내 — 복원 대상 DB를 명확히 표시. activeBrand가 null인 첫 렌더는 최소 높이로 공간 확보 ─── */}
      <div style={{ minHeight: 44, marginTop: 12 }}>
        {activeBrand && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background: activeBrand.id === 'main' ? 'var(--positive-soft)' : 'var(--warn-soft)',
              border: `1px solid ${
                activeBrand.id === 'main'
                  ? 'color-mix(in oklab, var(--positive) 30%, transparent)'
                  : 'color-mix(in oklab, var(--warn) 30%, transparent)'
              }`,
            }}
          >
            <Icon.alert
              style={{
                width: 16,
                height: 16,
                flexShrink: 0,
                color: activeBrand.id === 'main' ? 'var(--positive)' : 'var(--warn)',
              }}
            />
            <span style={{ fontSize: 13 }}>
              <b>복원 대상: {activeBrand.name}</b>
              {activeBrand.id !== 'main' ? (
                <span style={{ color: 'var(--warn)', fontWeight: 700 }}>
                  {' '}
                  — 7번가피자 데이터를 복원하려면 상단에서 브랜드를 7번가피자로 전환하세요.
                </span>
              ) : (
                <span style={{ color: 'var(--text-2)' }}> — 7번가피자 DB에 복원됩니다.</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* ── 완료 상태 카드 ─────────────────────────────────── */}
      {restoreDone && (
        <RestoreDoneCard restoreDone={restoreDone} onReset={() => setRestoreDone(null)} />
      )}

      {/* ── 상단 경고 배너 ─────────────────────────────────── */}
      {!restoreDone && (
        <div
          className="card"
          style={{
            marginTop: 24,
            padding: '14px 18px',
            background: 'var(--negative-soft)',
            border: '1px solid color-mix(in oklab, var(--negative) 22%, transparent)',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <Icon.alert
            style={{ width: 18, height: 18, color: 'var(--negative)', marginTop: 2, flexShrink: 0 }}
          />
          <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6 }}>
            <b style={{ color: 'var(--negative)' }}>복원은 되돌릴 수 없습니다.</b> 파일 선택 →
            미리보기 확인 → 인라인 확인 단계를 거칩니다. 기본값으로 <b>복원 직전 자동 백업</b>이 한
            번 더 생성되어 실수 시 되돌릴 수 있습니다.
          </div>
        </div>
      )}

      {/* ── 1. 파일 선택 ───────────────────────────────────── */}
      {!restoreDone && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>1. 백업 파일 선택</h2>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFile}
            disabled={busy || !canRestore}
            style={{ fontSize: 13 }}
          />
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
            이전에 다운로드한 v3 백업 JSON 파일을 선택하세요.
            {!ready && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>DB 초기화 중…</span>}
          </p>
        </div>
      )}

      {parsed && !restoreDone && (
        <>
          <RestorePreview
            parsed={parsed}
            ready={ready}
            impact={impact}
            dangerRows={dangerRows}
            wipeRows={wipeRows}
            unchangedSelectedStores={unchangedSelectedStores}
            scopes={scopes}
            toggleScope={toggleScope}
            setAllScopes={setAllScopes}
            selectedKeys={selectedKeys}
          />
          <RestoreExecutePanel
            busy={busy}
            confirming={confirming}
            setConfirming={setConfirming}
            autoBackup={autoBackup}
            setAutoBackup={setAutoBackup}
            backupFailed={backupFailed}
            setBackupFailed={setBackupFailed}
            restoreProgress={restoreProgress}
            selectedKeys={selectedKeys}
            selectedRestoreStoreCount={selectedRestoreStoreCount}
            ready={ready}
            canRestore={canRestore}
            handleRestore={handleRestore}
            impact={impact}
            dangerRows={dangerRows}
            wipeRows={wipeRows}
            failedStoreCount={failedStoreCount}
            allowFailedStoreRestore={allowFailedStoreRestore}
            setAllowFailedStoreRestore={setAllowFailedStoreRestore}
          />
        </>
      )}
    </main>
  );
}
