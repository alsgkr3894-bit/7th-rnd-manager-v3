'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import {
  initDB,
  importAll,
  MODULE_GROUPS,
  MODULE_KEYS,
  storesForScopes,
  collectStoreStats,
  exportAll,
  ALL_STORES,
  hasStore,
} from '@/lib/db';
import { downloadJson, makeFileName, readFileAsText } from '@/lib/download';
import { addEntry } from '@/lib/backup-history';
import { validateBackupPayload } from '@/lib/backup/validation';
import { formatNumber } from '@/lib/format';
import { useModuleScopes } from '@/hooks/useModuleScopes';
import { ModuleScopeList } from '@/components/settings/ModuleScopeList';
import { Toggle } from '@/components/ui/Toggle';
import { getActiveBrand } from '@/lib/active-brand';

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
  // SSR/클라이언트 불일치 방지 — 마운트 후 활성 브랜드 읽기
  const [activeBrand, setActiveBrand] = useState(null);
  const [ready,           setReady]           = useState(false);
  const [parsed,          setParsed]          = useState(null);     // 백업 파일 파싱 결과
  const [busy,            setBusy]            = useState(false);
  const [confirming,      setConfirming]      = useState(false);
  const [autoBackup,      setAutoBackup]      = useState(true);
  const [currentStats,    setCurrentStats]    = useState(null);     // 현재 DB store 행수
  const [restoreProgress, setRestoreProgress] = useState(null);    // { label, current, total }
  const [restoreDone,     setRestoreDone]     = useState(null);    // 완료 결과: { imported, skipped, modules }
  const [backupFailed,    setBackupFailed]    = useState(false);   // 자동백업 실패 후 재확인 대기
  const { scopes, toggleScope, setAllScopes } = useModuleScopes();
  const fileRef = useRef(null);

  useEffect(() => {
    setActiveBrand(getActiveBrand());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        setReady(true);
        setCurrentStats(await collectStoreStats());
      } catch (err) {
        console.error('[Restore] DB 초기화 실패:', err);
        showToast('DB 초기화에 실패했습니다.', 'err');
      }
    })();
  }, []);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) {
      showToast('파일이 너무 큽니다 (최대 500MB)', 'err');
      return;
    }
    setParsed(null);
    setConfirming(false);
    setRestoreDone(null);
    try {
      const text = await readFileAsText(file);
      const data = JSON.parse(text);
      const { backup, summary } = validateBackupPayload(data);
      if (summary.versionMismatch) {
        showToast(
          `백업 파일 버전(${summary.version})이 현재(v3)와 다릅니다. 일부 데이터가 올바르게 복원되지 않을 수 있습니다.`,
          'warn', 6000
        );
      }
      if (summary.unknownStores.length > 0) {
        showToast(`알 수 없는 store ${summary.unknownStores.length}개는 복원에서 건너뜁니다.`, 'warn', 6000);
      }
      setParsed({ ...backup, _fileName: file.name, _summary: summary });
    } catch (err) {
      console.error('[Restore] 파일 파싱 실패:', err);
      showToast('백업 파일을 읽을 수 없습니다: ' + err.message, 'err');
    }
  }

  const selectedKeys   = MODULE_KEYS.filter(k => scopes[k]);
  const selectedStores = storesForScopes(selectedKeys);

  // 백업 vs 현재 차이 (선택 범위 한정)
  const impact = useMemo(() => {
    if (!parsed || !currentStats) return null;
    const rows = [];
    let totalNow = 0, totalAfter = 0;
    for (const name of selectedStores) {
      const now   = currentStats[name] || 0;
      const after = Array.isArray(parsed.stores?.[name]) ? parsed.stores[name].length : 0;
      if (now === 0 && after === 0) continue;
      rows.push({ name, now, after, diff: after - now });
      totalNow  += now;
      totalAfter += after;
    }
    return { rows, totalNow, totalAfter };
  }, [parsed, currentStats, selectedStores]);

  // 위험 store — 현재 데이터가 줄어드는 행
  const dangerRows = useMemo(
    () => (impact?.rows || []).filter(r => r.now > 0 && r.after < r.now),
    [impact]
  );
  const wipeRows = useMemo(
    () => dangerRows.filter(r => r.after === 0),
    [dangerRows]
  );

  // 백업 파일에 있는 store 중 현재 DB에 없는 것
  const missingStores = parsed && ready
    ? Object.keys(parsed.stores).filter(n => ALL_STORES.includes(n) && !hasStore(n))
    : [];
  const unknownStores = parsed?._summary?.unknownStores || [];
  const backupTotalRows = parsed?._summary?.totalRows
    ?? (parsed ? Object.values(parsed.stores).reduce((s, r) => s + (Array.isArray(r) ? r.length : 0), 0) : 0);

  // 백업 파일 age (일)
  const backupAgeDays = parsed?.exportedAt
    ? Math.floor((Date.now() - new Date(parsed.exportedAt).getTime()) / 86400000)
    : null;

  async function handleRestore(skipBackupCheck = false) {
    if (!parsed || busy) return;
    setBusy(true);
    setRestoreProgress({ label: '복원 준비 중', current: 0, total: Math.max(selectedStores.length, 1) });
    try {
      // 1) 복원 직전 자동 백업
      if (autoBackup && !skipBackupCheck) {
        try {
          setRestoreProgress({ label: '자동 백업 생성 중', current: 0, total: Math.max(selectedStores.length, 1) });
          const backup   = await exportAll();
          const fileName = makeFileName('rnd-manager-auto-before-restore', 'json');
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

      // 2) 선택된 모듈의 store만 import
      const partialData = {
        ...parsed,
        stores: Object.fromEntries(
          Object.entries(parsed.stores).filter(([name]) => selectedStores.includes(name))
        ),
      };
      const restoreTotal = Object.keys(partialData.stores).length || 1;
      setRestoreProgress({ label: 'store 복원 시작', current: 0, total: restoreTotal });
      const result = await importAll(partialData, {
        onProgress: ({ store, index, total }) => {
          const rowCount = Array.isArray(partialData.stores?.[store])
            ? partialData.stores[store].length : 0;
          const label = rowCount > 500
            ? `${store} 복원 중 (${formatNumber(rowCount)}건, 청크 분할)`
            : `${store} 복원 중`;
          setRestoreProgress({ label, current: index, total });
        },
      });
      const { imported, skipped, errors } = result || {};

      if (errors?.length > 0) {
        showToast(
          `복원 일부 완료 — 성공 ${imported}개 / 건너뜀 ${skipped}개. ` +
          `'시스템 설정 → DB 완전 재생성' 후 다시 시도하면 전체 복원됩니다.`,
          'warn'
        );
        console.warn('[Restore] 일부 실패:', errors);
      }

      // 작업 로그 — 복원 이벤트
      import('@/lib/work-log')
        .then(m => m.logWork('RESTORE', `복원 ${imported}개 store (${selectedKeys.length}개 모듈)${skipBackupCheck ? ' · 자동백업 없이' : ''}`))
        .catch(() => {});

      // 완료 상태로 전환 — alert·자동 reload 없이 인라인 카드
      setRestoreDone({
        imported, skipped: skipped ?? 0, errors: errors ?? [],
        modules: selectedKeys,
        backupSkipped: skipBackupCheck,   // 자동백업 없이 진행했는지 결과 카드에 표시
      });
      setParsed(null);
      setConfirming(false);
      if (fileRef.current) fileRef.current.value = '';
      setCurrentStats(await collectStoreStats());
    } catch (err) {
      console.error('[Restore] 복원 실패:', err);
      const isSchemaIssue = String(err.message || '').includes('object stores was not found');
      showToast(
        '복원 중 오류: ' + err.message +
        (isSchemaIssue ? ' (해결: 시스템 설정 → 위험 영역 → "DB 완전 재생성")' : ''),
        'err'
      );
    } finally {
      setBusy(false);
      setRestoreProgress(null);
    }
  }

  // ── 공통 스타일 헬퍼 ──────────────────────────────────────
  const chipStyle = (active) => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 700,
    background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
    color:      active ? 'var(--accent-text)' : 'var(--text-3)',
  });

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
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 8,
          background: activeBrand.id === 'main' ? 'var(--positive-soft)' : 'var(--warn-soft)',
          border: `1px solid ${activeBrand.id === 'main'
            ? 'color-mix(in oklab, var(--positive) 30%, transparent)'
            : 'color-mix(in oklab, var(--warn) 30%, transparent)'}`,
        }}>
          <Icon.alert style={{ width: 16, height: 16, flexShrink: 0,
            color: activeBrand.id === 'main' ? 'var(--positive)' : 'var(--warn)' }} />
          <span style={{ fontSize: 13 }}>
            <b>복원 대상: {activeBrand.name}</b>
            {activeBrand.id !== 'main'
              ? <span style={{ color: 'var(--warn)', fontWeight: 700 }}>
                  {' '}— 7번가피자 데이터를 복원하려면 상단에서 브랜드를 7번가피자로 전환하세요.
                </span>
              : <span style={{ color: 'var(--text-2)' }}> — 7번가피자 DB에 복원됩니다.</span>
            }
          </span>
        </div>
      )}
      </div>

      {/* ── 완료 상태 카드 ─────────────────────────────────── */}
      {restoreDone && (
        <div className="card" style={{
          marginTop: 24,
          padding: '18px 20px',
          background: restoreDone.errors.length === 0 ? 'var(--positive-soft)' : 'var(--warn-soft)',
          border: `1px solid ${restoreDone.errors.length === 0
            ? 'color-mix(in oklab, var(--positive) 30%, transparent)'
            : 'color-mix(in oklab, var(--warn) 30%, transparent)'}`,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Icon.check style={{
              width: 20, height: 20, flexShrink: 0, marginTop: 1,
              color: restoreDone.errors.length === 0 ? 'var(--positive)' : 'var(--warn)',
            }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>
                {restoreDone.errors.length === 0 ? '복원 완료' : '복원 완료 (일부 실패)'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                {restoreDone.imported}개 store 복원됨
                {restoreDone.skipped > 0 && ` · ${restoreDone.skipped}개 건너뜀`}
                {restoreDone.errors.length > 0 && ` · ${restoreDone.errors.length}개 실패`}
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {restoreDone.modules.map(k => (
                  <span key={k} style={chipStyle(true)}>{MODULE_GROUPS[k]?.label || k}</span>
                ))}
              </div>
              {restoreDone.backupSkipped && (
                <div style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 600, marginTop: 8 }}>
                  ⚠ 자동 백업 없이 복원했습니다 (복원 직전 상태는 백업되지 않음).
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
                변경된 데이터를 화면에 반영하려면 새로고침이 필요합니다.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setRestoreDone(null)}>다른 파일 복원</button>
            <button className="btn primary" onClick={() => window.location.reload()}>
              새로고침
            </button>
          </div>
        </div>
      )}

      {/* ── 상단 경고 배너 ─────────────────────────────────── */}
      {!restoreDone && (
        <div className="card" style={{
          marginTop: 24, padding: '14px 18px',
          background: 'var(--negative-soft)',
          border: '1px solid color-mix(in oklab, var(--negative) 22%, transparent)',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <Icon.alert style={{ width: 18, height: 18, color: 'var(--negative)', marginTop: 2, flexShrink: 0 }}/>
          <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6 }}>
            <b style={{ color: 'var(--negative)' }}>복원은 되돌릴 수 없습니다.</b>{' '}
            파일 선택 → 미리보기 확인 → 인라인 확인 단계를 거칩니다.
            기본값으로 <b>복원 직전 자동 백업</b>이 한 번 더 생성되어 실수 시 되돌릴 수 있습니다.
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
            disabled={busy}
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
          {/* ── 2. 미리보기 ──────────────────────────────────── */}
          <div className="card" style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>2. 백업 파일 미리보기</h2>
            <div style={{ display: 'flex', gap: 32, marginBottom: 16, padding: '8px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>파일</div>
                <div style={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>{parsed._fileName}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>버전</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{parsed.version || '미상'}</div>
              </div>
              {parsed.exportedAt && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>백업 시점</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {new Date(parsed.exportedAt).toLocaleString('ko-KR')}
                    {backupAgeDays !== null && backupAgeDays > 30 && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--warn)', fontWeight: 700 }}>
                        ({backupAgeDays}일 전)
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>총 행</div>
                <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>
                  {formatNumber(backupTotalRows)}건
                </div>
              </div>
            </div>

            {/* schema 불일치 경고 */}
            {missingStores.length > 0 && (
              <div style={{ padding: 12, background: 'var(--warn-soft)', borderRadius: 8, fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6 }}>
                <b style={{ color: 'var(--warn)' }}>일부 store가 현재 DB에 없습니다.</b>{' '}
                <span className="num" style={{ fontSize: 12 }}>
                  {missingStores.slice(0, 5).join(', ')}{missingStores.length > 5 ? ` 외 ${missingStores.length - 5}개` : ''}
                </span>
                <br/>
                전체 복원을 원하면 먼저 <b>시스템 설정 → 위험 영역 → "DB 완전 재생성"</b>을 실행하세요.
              </div>
            )}
            {unknownStores.length > 0 && (
              <div style={{ marginTop: 10, padding: 12, background: 'var(--surface-2)', borderRadius: 8, fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6 }}>
                <b>알 수 없는 store는 복원에서 건너뜁니다.</b>{' '}
                <span className="num" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {unknownStores.slice(0, 5).join(', ')}{unknownStores.length > 5 ? ` 외 ${unknownStores.length - 5}개` : ''}
                </span>
              </div>
            )}
          </div>

          {/* ── 3. 복원 범위 선택 ─────────────────────────────── */}
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>3. 복원 범위</h2>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                  선택한 모듈만 백업 시점으로 되돌립니다. 나머지는 현재 상태 유지.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn sm" onClick={() => setAllScopes(true)}>전체</button>
                <button className="btn sm" onClick={() => setAllScopes(false)}>해제</button>
              </div>
            </div>
            <ModuleScopeList
              scopes={scopes}
              onToggle={toggleScope}
              getCountLabel={(key, g) => {
                const count = g.stores.reduce(
                  (sum, n) => sum + (Array.isArray(parsed.stores?.[n]) ? parsed.stores[n].length : 0), 0
                );
                return `백업 ${formatNumber(count)}건`;
              }}
            />

            {/* 선택 범위 요약 칩 */}
            <div style={{
              marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)',
              display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginRight: 2 }}>선택:</span>
              {selectedKeys.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 600 }}>
                  ⚠ 복원할 모듈을 선택해주세요
                </span>
              ) : (
                selectedKeys.map(k => (
                  <span key={k} style={chipStyle(true)}>{MODULE_GROUPS[k]?.label || k}</span>
                ))
              )}
            </div>
          </div>

          {/* ── 4. 예상 변경 사항 (위험 store 강조) ──────────── */}
          {impact && impact.rows.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>4. 예상 변경 사항</h2>
                {dangerRows.length > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: 'var(--negative-soft)', color: 'var(--negative)',
                  }}>
                    ⚠ 데이터 감소 {dangerRows.length}개
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
                선택한 모듈의 현재 상태와 백업 시점 비교
              </p>

              {/* 합계 요약 */}
              <div style={{ display: 'flex', gap: 24, padding: '8px 0', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>현재</div>
                  <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{formatNumber(impact.totalNow)}건</div>
                </div>
                <div style={{ color: 'var(--text-4)', alignSelf: 'center', fontSize: 18 }}>→</div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>복원 후</div>
                  <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>{formatNumber(impact.totalAfter)}건</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>변동</div>
                  <div className="num" style={{
                    fontWeight: 700, fontSize: 18,
                    color: impact.totalAfter > impact.totalNow ? 'var(--accent-text)'
                         : impact.totalAfter < impact.totalNow ? 'var(--negative)' : 'var(--text-3)',
                  }}>
                    {impact.totalAfter - impact.totalNow > 0 ? '+' : ''}
                    {formatNumber(impact.totalAfter - impact.totalNow)}건
                  </div>
                </div>
              </div>

              {/* store별 상세 테이블 */}
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>store</th>
                      <th style={{ textAlign: 'right', width: 90 }}>현재</th>
                      <th style={{ textAlign: 'right', width: 90 }}>복원 후</th>
                      <th style={{ textAlign: 'right', width: 90 }}>변동</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impact.rows.map(r => {
                      const isWipe    = r.now > 0 && r.after === 0;
                      const isDanger  = r.now > 0 && r.after < r.now;
                      return (
                        <tr
                          key={r.name}
                          style={{
                            background: isWipe
                              ? 'color-mix(in oklab, var(--negative) 8%, transparent)'
                              : isDanger
                                ? 'color-mix(in oklab, var(--warn) 6%, transparent)'
                                : undefined,
                          }}
                        >
                          <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isWipe && (
                              <span title="현재 데이터 전체 삭제" style={{ color: 'var(--negative)', fontSize: 12, fontWeight: 700 }}>⊗</span>
                            )}
                            {!isWipe && isDanger && (
                              <span title="현재보다 데이터 감소" style={{ color: 'var(--warn)', fontSize: 12 }}>↓</span>
                            )}
                            <span className="num" style={{ fontSize: 12, color: isWipe ? 'var(--negative)' : isDanger ? 'var(--warn)' : 'var(--text-3)' }}>
                              {r.name}
                            </span>
                          </td>
                          <td className="num" style={{ textAlign: 'right' }}>{formatNumber(r.now)}</td>
                          <td className="num" style={{ textAlign: 'right', fontWeight: isWipe || isDanger ? 700 : undefined }}>
                            {formatNumber(r.after)}
                          </td>
                          <td className="num" style={{
                            textAlign: 'right',
                            color: r.diff > 0 ? 'var(--accent-text)' : r.diff < 0 ? 'var(--negative)' : 'var(--text-4)',
                          }}>
                            {r.diff > 0 ? '+' : ''}{formatNumber(r.diff)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 위험 항목 요약 배너 */}
              {dangerRows.length > 0 && (
                <div style={{
                  marginTop: 10, padding: '10px 14px', borderRadius: 8,
                  background: wipeRows.length > 0 ? 'var(--negative-soft)' : 'var(--warn-soft)',
                  fontSize: 13, lineHeight: 1.6,
                  color: wipeRows.length > 0 ? 'var(--negative)' : 'var(--warn)',
                }}>
                  {wipeRows.length > 0 && (
                    <>
                      <b>⊗ 전체 삭제 {wipeRows.length}개:</b>{' '}
                      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {wipeRows.map(r => r.name).join(', ')}
                      </span>
                      <br/>
                    </>
                  )}
                  {dangerRows.length > wipeRows.length && (
                    <>
                      <b>↓ 데이터 감소 {dangerRows.length - wipeRows.length}개:</b>{' '}
                      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {dangerRows.filter(r => r.after > 0).map(r => r.name).join(', ')}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── 5. 실행 ──────────────────────────────────────── */}
          <div className="card" style={{ marginTop: 16, background: 'var(--negative-soft)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>5. 복원 실행</h2>

            {/* 자동 백업 옵션 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0', borderBottom: '1px solid var(--border)', marginBottom: 12,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>복원 직전 자동 백업</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  복원 실행 직전에 현재 상태를 JSON으로 자동 다운로드합니다 (실수 시 되돌릴 수 있음)
                </div>
              </div>
              <Toggle value={autoBackup} onChange={() => setAutoBackup(v => !v)} />
            </div>

            {/* 확인 요약 박스 (confirming 상태) */}
            {confirming && (
              <div style={{
                padding: '14px 16px', marginBottom: 12, borderRadius: 8,
                background: 'color-mix(in oklab, var(--negative) 6%, var(--surface))',
                border: '1px solid color-mix(in oklab, var(--negative) 25%, transparent)',
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--negative)' }}>
                  복원 실행 요약 — 계속하기 전에 확인하세요
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--text-3)', minWidth: 80, flexShrink: 0 }}>교체 모듈</span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {selectedKeys.map(k => (
                        <span key={k} style={chipStyle(true)}>{MODULE_GROUPS[k]?.label || k}</span>
                      ))}
                    </div>
                  </div>
                  {impact && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-3)', minWidth: 80, flexShrink: 0 }}>데이터 규모</span>
                      <span className="num" style={{ fontWeight: 700 }}>
                        현재 {formatNumber(impact.totalNow)}건 →{' '}
                        복원 후 {formatNumber(impact.totalAfter)}건
                        {impact.totalAfter < impact.totalNow && (
                          <span style={{ color: 'var(--negative)', marginLeft: 6 }}>
                            ({formatNumber(impact.totalAfter - impact.totalNow)}건)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {dangerRows.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--text-3)', minWidth: 80, flexShrink: 0 }}>위험 항목</span>
                      <span style={{ color: 'var(--negative)', fontWeight: 700 }}>
                        ⚠ 데이터가 줄어드는 store {dangerRows.length}개
                        {wipeRows.length > 0 && ` (완전 삭제 ${wipeRows.length}개 포함)`}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-3)', minWidth: 80, flexShrink: 0 }}>자동 백업</span>
                    {autoBackup ? (
                      <span style={{ color: 'var(--positive)', fontWeight: 600 }}>
                        ✓ 복원 직전 현재 상태 백업 후 진행
                      </span>
                    ) : (
                      <span style={{ color: 'var(--warn)', fontWeight: 600 }}>
                        ⚠ 자동 백업 없이 즉시 진행 (되돌리기 불가)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 자동백업 실패 재확인 박스 */}
            {backupFailed && (
              <div style={{
                padding: '12px 14px', marginBottom: 12, borderRadius: 8,
                background: 'var(--warn-soft)', border: '1px solid color-mix(in oklab, var(--warn) 30%, transparent)',
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--warn)', marginBottom: 6 }}>
                  ⚠ 자동 백업에 실패했습니다
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-1)', marginBottom: 10 }}>
                  복원 실패 시 되돌릴 수 없습니다. 백업 없이 복원을 계속 진행할까요?
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => { setBackupFailed(false); setConfirming(false); }}>
                    취소
                  </button>
                  <button
                    className="btn"
                    onClick={() => { setBackupFailed(false); handleRestore(true); }}
                    style={{ background: 'var(--negative)', color: '#fff', border: 'none', fontWeight: 700 }}
                  >
                    백업 없이 복원
                  </button>
                </div>
              </div>
            )}

            {/* 버튼 영역 */}
            {!confirming ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn"
                  disabled={busy || selectedKeys.length === 0}
                  onClick={() => setConfirming(true)}
                  style={{ color: 'var(--negative)', borderColor: 'var(--negative)' }}
                >
                  복원 실행
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button className="btn" disabled={busy} onClick={() => setConfirming(false)}>
                  취소
                </button>
                <button
                  className="btn"
                  disabled={busy || !ready}
                  onClick={() => handleRestore(false)}
                  style={{
                    background: 'var(--negative)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                  }}
                >
                  {busy
                    ? <><span style={{ display: 'inline-block', marginRight: 6, animation: 'spin 1s linear infinite' }}>⟳</span>복원 중…</>
                    : `${selectedKeys.length}개 모듈 교체 복원`}
                </button>
              </div>
            )}

            {/* 진행률 바 */}
            {busy && restoreProgress && (
              <div style={{
                marginTop: 12, padding: '10px 12px',
                border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-2)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700 }}>{restoreProgress.label}</span>
                  <span className="num">
                    {formatNumber(Math.min(restoreProgress.current, restoreProgress.total))} / {formatNumber(restoreProgress.total)}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--surface-3)' }}>
                  <div style={{
                    width: `${Math.max(6, Math.min(100, (restoreProgress.current / Math.max(restoreProgress.total, 1)) * 100))}%`,
                    height: '100%',
                    background: 'var(--negative)',
                    transition: 'width 180ms ease',
                  }}/>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
