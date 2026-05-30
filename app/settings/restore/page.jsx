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
} from '@/lib/db';
import { downloadJson, makeFileName, readFileAsText } from '@/lib/download';
import { addEntry } from '@/lib/backup-history';
import { formatNumber } from '@/lib/format';
import { useModuleScopes } from '@/hooks/useModuleScopes';
import { ModuleScopeList } from '@/components/settings/ModuleScopeList';

/**
 * 데이터 복원 페이지
 *
 * 흐름:
 *   1. 파일 선택 → JSON 파싱
 *   2. 미리보기 (백업 vs 현재 차이)
 *   3. 복원 범위 선택 (5개 모듈)
 *   4. (옵션) 복원 직전 자동 백업
 *   5. 인라인 확인 → 실제 복원
 */
export default function Page() {
  const [ready, setReady] = useState(false);
  const [parsed, setParsed] = useState(null);          // 백업 파일 파싱 결과
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);  // 복원 전 자동 백업
  const [currentStats, setCurrentStats] = useState(null); // 현재 DB store별 행수
  const { scopes, toggleScope, setAllScopes } = useModuleScopes();
  const fileRef = useRef(null);

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
    setParsed(null);
    setConfirming(false);
    try {
      const text = await readFileAsText(file);
      const data = JSON.parse(text);
      if (!data || typeof data.stores !== 'object') {
        throw new Error('잘못된 백업 파일 형식 (stores 객체 누락)');
      }
      setParsed({ ...data, _fileName: file.name });
    } catch (err) {
      console.error('[Restore] 파일 파싱 실패:', err);
      showToast('백업 파일을 읽을 수 없습니다: ' + err.message, 'err');
    }
  }

  const selectedKeys = MODULE_KEYS.filter(k => scopes[k]);
  const selectedStores = storesForScopes(selectedKeys);

  // 백업 vs 현재 차이 계산 (선택된 store 한정)
  const impact = useMemo(() => {
    if (!parsed || !currentStats) return null;
    const rows = [];
    let totalNow = 0, totalAfter = 0;
    for (const name of selectedStores) {
      const now = currentStats[name] || 0;
      const after = Array.isArray(parsed.stores?.[name]) ? parsed.stores[name].length : 0;
      if (now === 0 && after === 0) continue;
      rows.push({ name, now, after, diff: after - now });
      totalNow += now;
      totalAfter += after;
    }
    return { rows, totalNow, totalAfter };
  }, [parsed, currentStats, selectedStores]);

  // 백업 파일에 있는 store 중 현재 DB에 없는 것
  const missingStores = parsed && ready
    ? Object.keys(parsed.stores).filter(name =>
        ALL_STORES.includes(name) && !hasStore(name)
      )
    : [];

  async function handleRestore() {
    if (!parsed || busy) return;
    setBusy(true);
    try {
      // 1) 복원 직전 자동 백업 (옵션)
      if (autoBackup) {
        try {
          const backup = await exportAll();
          const fileName = makeFileName('rnd-manager-auto-before-restore', 'json');
          downloadJson(backup, fileName);
          addEntry({
            scopes: MODULE_KEYS,
            totalRows: Object.values(currentStats || {}).reduce((s, n) => s + n, 0),
            fileName,
          });
          showToast(`복원 직전 자동 백업 완료 — ${fileName}`, 'info');
        } catch (bkErr) {
          console.error('[Restore] 자동 백업 실패:', bkErr);
          showToast('자동 백업에 실패했습니다. 계속 진행합니다.', 'warn');
        }
      }

      // 2) 선택된 모듈의 store만 import (백업 파일에서 해당 부분만 추출)
      const partialData = {
        ...parsed,
        stores: Object.fromEntries(
          Object.entries(parsed.stores).filter(([name]) => selectedStores.includes(name))
        ),
      };
      const result = await importAll(partialData);
      const { imported, skipped, errors } = result || {};

      if (errors && errors.length > 0) {
        showToast(
          `복원 일부 완료 — 성공 ${imported}개 / 건너뜀 ${skipped}개. ` +
          `'시스템 설정 → DB 완전 재생성' 후 다시 시도하면 전체 복원됩니다.`,
          'warn'
        );
        console.warn('[Restore] 일부 실패:', errors);
      } else {
        showToast(`복원이 완료되었습니다. (${imported}개 store)`, 'ok');
      }

      // 상태 초기화
      setParsed(null);
      setConfirming(false);
      if (fileRef.current) fileRef.current.value = '';
      setCurrentStats(await collectStoreStats());
    } catch (err) {
      console.error('[Restore] 복원 실패:', err);
      const isSchemaIssue = String(err.message || '').includes('object stores was not found');
      const hint = isSchemaIssue ? ' (해결: 시스템 설정 → 위험 영역 → "DB 완전 재생성")' : '';
      showToast('복원 중 오류: ' + err.message + hint, 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["설정 / 백업", "데이터 복원"]}
        title="데이터 복원"
        sub="백업 시점으로 데이터를 되돌립니다. 복원은 되돌릴 수 없으니 신중히 진행하세요."
      />

      {/* 상단 경고 배너 */}
      <div className="card" style={{
        marginTop:24,padding:'14px 18px',
        background:'var(--negative-soft)',
        border:'1px solid color-mix(in oklab, var(--negative) 22%, transparent)',
        display:'flex',gap:12,alignItems:'flex-start',
      }}>
        <Icon.alert style={{width:18,height:18,color:'var(--negative)',marginTop:2,flex:'0 0 18px'}}/>
        <div style={{fontSize:13,color:'var(--text-1)',lineHeight:1.6}}>
          <b style={{color:'var(--negative)'}}>복원은 되돌릴 수 없습니다.</b>{' '}
          파일 선택 → 미리보기 확인 → 인라인 확인 단계를 거칩니다.
          기본값으로 <b>복원 직전 자동 백업</b>이 한 번 더 생성되어 실수 시 되돌릴 수 있습니다.
        </div>
      </div>

      {/* 1. 파일 선택 */}
      <div className="card" style={{marginTop:16}}>
        <h2 style={{fontSize:15,fontWeight:700,marginBottom:12}}>1. 백업 파일 선택</h2>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          disabled={!ready || busy}
          style={{fontSize:13}}
        />
        <p style={{fontSize:12,color:'var(--text-3)',marginTop:8}}>
          이전에 다운로드한 v3 백업 JSON 파일을 선택하세요.
        </p>
      </div>

      {parsed && (
        <>
          {/* 2. 미리보기 */}
          <div className="card" style={{marginTop:16}}>
            <h2 style={{fontSize:15,fontWeight:700,marginBottom:16}}>2. 백업 파일 미리보기</h2>
            <div style={{display:'flex',gap:32,marginBottom:16,padding:'8px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:12,color:'var(--text-3)'}}>파일</div>
                <div style={{fontWeight:600,fontSize:13,fontFamily:'monospace'}}>{parsed._fileName}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:'var(--text-3)'}}>버전</div>
                <div style={{fontWeight:600,fontSize:13}}>{parsed.version || '미상'}</div>
              </div>
              {parsed.exportedAt && (
                <div>
                  <div style={{fontSize:12,color:'var(--text-3)'}}>백업 시점</div>
                  <div style={{fontWeight:600,fontSize:13}}>{new Date(parsed.exportedAt).toLocaleString('ko-KR')}</div>
                </div>
              )}
              <div>
                <div style={{fontSize:12,color:'var(--text-3)'}}>총 행</div>
                <div className="num" style={{fontWeight:700,fontSize:18}}>
                  {formatNumber(Object.values(parsed.stores).reduce((s, r) => s + (Array.isArray(r) ? r.length : 0), 0))}건
                </div>
              </div>
            </div>

            {/* schema 불일치 경고 */}
            {missingStores.length > 0 && (
              <div style={{padding:12,background:'var(--warn-soft)',borderRadius:8,marginTop:8,fontSize:13,color:'var(--text-1)',lineHeight:1.6}}>
                <b style={{color:'var(--warn)'}}>일부 store가 현재 DB에 없습니다.</b>{' '}
                <span className="num" style={{fontSize:12}}>
                  {missingStores.slice(0, 5).join(', ')}{missingStores.length > 5 ? ` 외 ${missingStores.length - 5}개` : ''}
                </span>
                <br/>
                전체 복원을 원하면 먼저 <b>시스템 설정 → 위험 영역 → "DB 완전 재생성"</b>을 실행하세요.
              </div>
            )}
          </div>

          {/* 3. 복원 범위 선택 */}
          <div className="card" style={{marginTop:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <div>
                <h2 style={{fontSize:15,fontWeight:700}}>3. 복원 범위</h2>
                <p style={{fontSize:13,color:'var(--text-3)',marginTop:4}}>
                  선택한 모듈만 백업 시점으로 되돌립니다. 나머지는 현재 상태 유지.
                </p>
              </div>
              <div style={{display:'flex',gap:6}}>
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
          </div>

          {/* 4. 예상 변경 사항 */}
          {impact && impact.rows.length > 0 && (
            <div className="card" style={{marginTop:16}}>
              <h2 style={{fontSize:15,fontWeight:700,marginBottom:4}}>4. 예상 변경 사항</h2>
              <p style={{fontSize:13,color:'var(--text-3)',marginBottom:12}}>
                선택한 모듈의 현재 상태와 백업 시점 비교
              </p>
              <div style={{display:'flex',gap:24,padding:'8px 0',borderBottom:'1px solid var(--border)',marginBottom:8}}>
                <div>
                  <div style={{fontSize:12,color:'var(--text-3)'}}>현재 행 수</div>
                  <div className="num" style={{fontWeight:700,fontSize:18}}>{formatNumber(impact.totalNow)}건</div>
                </div>
                <div style={{color:'var(--text-4)',alignSelf:'center'}}>→</div>
                <div>
                  <div style={{fontSize:12,color:'var(--text-3)'}}>복원 후 행 수</div>
                  <div className="num" style={{fontWeight:700,fontSize:18}}>{formatNumber(impact.totalAfter)}건</div>
                </div>
                <div>
                  <div style={{fontSize:12,color:'var(--text-3)'}}>변동</div>
                  <div className="num" style={{
                    fontWeight:700,fontSize:18,
                    color: impact.totalAfter > impact.totalNow ? 'var(--accent-text)'
                         : impact.totalAfter < impact.totalNow ? 'var(--negative)' : 'var(--text-3)',
                  }}>
                    {impact.totalAfter - impact.totalNow > 0 ? '+' : ''}
                    {formatNumber(impact.totalAfter - impact.totalNow)}건
                  </div>
                </div>
              </div>
              <div style={{maxHeight:220,overflowY:'auto'}}>
                <table className="data-table" style={{width:'100%'}}>
                  <thead>
                    <tr>
                      <th>store</th>
                      <th style={{textAlign:'right',width:90}}>현재</th>
                      <th style={{textAlign:'right',width:90}}>복원 후</th>
                      <th style={{textAlign:'right',width:90}}>변동</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impact.rows.map(r => (
                      <tr key={r.name}>
                        <td className="num" style={{fontSize:12,color:'var(--text-3)'}}>{r.name}</td>
                        <td className="num" style={{textAlign:'right'}}>{formatNumber(r.now)}</td>
                        <td className="num" style={{textAlign:'right'}}>{formatNumber(r.after)}</td>
                        <td className="num" style={{
                          textAlign:'right',
                          color: r.diff > 0 ? 'var(--accent-text)' : r.diff < 0 ? 'var(--negative)' : 'var(--text-4)',
                        }}>
                          {r.diff > 0 ? '+' : ''}{formatNumber(r.diff)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. 실행 */}
          <div className="card" style={{marginTop:16,background:'var(--negative-soft)'}}>
            <h2 style={{fontSize:15,fontWeight:700,marginBottom:12}}>5. 복원 실행</h2>

            {/* 자동 백업 옵션 */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--border)',marginBottom:12}}>
              <div>
                <div style={{fontWeight:600,fontSize:13}}>복원 직전 자동 백업</div>
                <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>
                  복원 실행 직전에 현재 상태를 JSON으로 자동 다운로드합니다 (실수 시 되돌릴 수 있음)
                </div>
              </div>
              <Toggle value={autoBackup} onChange={() => setAutoBackup(v => !v)} />
            </div>

            {!confirming ? (
              <div style={{display:'flex',justifyContent:'flex-end'}}>
                <button
                  className="btn"
                  disabled={busy || selectedKeys.length === 0}
                  onClick={() => setConfirming(true)}
                  style={{color:'var(--negative)',borderColor:'var(--negative)'}}
                >
                  복원 실행
                </button>
              </div>
            ) : (
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
                <span style={{color:'var(--negative)',fontWeight:600,fontSize:13,marginRight:'auto'}}>
                  정말 복원할까요? {autoBackup ? '(자동 백업 후 진행)' : '(자동 백업 없이 진행)'}
                </span>
                <button className="btn" disabled={busy} onClick={() => setConfirming(false)}>취소</button>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={handleRestore}
                  style={{background:'var(--negative)'}}
                >
                  {busy ? '복원 중…' : '정말 복원'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}

