'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import {
  initDB,
  getAll,
  exportSelected,
  storesForScopes,
  MODULE_GROUPS,
  MODULE_KEYS,
  ALL_STORES,
} from '@/lib/db';
import { downloadJson, makeFileName } from '@/lib/download';
import { formatNumber } from '@/lib/format';
import { getHistory, addEntry, getLastBackupAt } from '@/lib/backup-history';

/**
 * 데이터 백업 페이지
 *
 * 디자인 참고하되 브라우저 SPA 한계 반영:
 *   - 자동 백업/S3 저장/암호화 등은 외부 시스템 필요 → 제외
 *   - 마지막 백업 시각, 모듈 선택, 이력은 localStorage 기반
 */
export default function Page() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);

  // 백업 범위 (5개 모듈 모두 기본 선택)
  const [scopes, setScopes] = useState(() => {
    const init = {};
    MODULE_KEYS.forEach(k => { init[k] = true; });
    return init;
  });

  // 이력
  const [lastBackupAt, setLastBackupAt] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        setReady(true);
        await refreshStats();
      } catch (err) {
        console.error('[Backup] DB 초기화 실패:', err);
        showToast('DB 초기화에 실패했습니다.', 'err');
      }
    })();
    refreshHistory();
  }, []);

  async function refreshStats() {
    const result = {};
    for (const name of ALL_STORES) {
      try {
        const rows = await getAll(name);
        result[name] = rows.length;
      } catch {
        result[name] = 0;
      }
    }
    setStats(result);
  }

  function refreshHistory() {
    setHistory(getHistory());
    setLastBackupAt(getLastBackupAt());
  }

  function toggleScope(key) {
    setScopes(s => ({ ...s, [key]: !s[key] }));
  }

  function setAllScopes(value) {
    const next = {};
    MODULE_KEYS.forEach(k => { next[k] = value; });
    setScopes(next);
  }

  // 선택된 모듈 키
  const selectedKeys = MODULE_KEYS.filter(k => scopes[k]);
  // 선택된 store 목록
  const selectedStores = storesForScopes(selectedKeys);
  // 선택된 행 수
  const selectedRows = stats
    ? selectedStores.reduce((sum, name) => sum + (stats[name] || 0), 0)
    : 0;

  async function handleBackup() {
    if (busy || selectedKeys.length === 0) return;
    setBusy(true);
    try {
      const data = await exportSelected(selectedStores, { scopes: selectedKeys });
      const fileName = makeFileName('rnd-manager-backup', 'json');
      downloadJson(data, fileName);
      // 이력 기록
      addEntry({
        scopes: selectedKeys,
        totalRows: selectedRows,
        fileName,
      });
      refreshHistory();
      showToast(`백업 완료 — ${fileName}`, 'ok');
    } catch (err) {
      console.error('[Backup] 실패:', err);
      showToast('백업 중 오류가 발생했습니다.', 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["설정 / 백업", "데이터 백업"]}
        title="데이터 백업"
        sub="원하는 모듈을 선택하여 JSON 파일로 다운로드 (사용자 PC에 저장)"
        actions={
          <button
            className="btn primary"
            disabled={!ready || busy || selectedKeys.length === 0}
            onClick={handleBackup}
          >
            <Icon.download style={{width:14,height:14}}/>
            {busy ? '백업 중…' : '백업 파일 다운로드'}
          </button>
        }
      />

      {/* 요약 카드 */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,marginTop:24}}>
        <SummaryCard
          label="마지막 백업"
          value={lastBackupAt ? formatRelative(lastBackupAt) : '없음'}
          sub={lastBackupAt ? new Date(lastBackupAt).toLocaleString('ko-KR') : '아직 백업하지 않았습니다'}
        />
        <SummaryCard
          label="선택된 모듈"
          value={`${selectedKeys.length} / ${MODULE_KEYS.length}`}
          sub={selectedKeys.map(k => MODULE_GROUPS[k].label).join(' · ') || '선택된 항목 없음'}
        />
        <SummaryCard
          label="선택된 데이터"
          value={`${formatNumber(selectedRows)}건`}
          sub={ready ? '백업 파일 예상 크기는 데이터에 따라 다릅니다' : 'DB 초기화 중…'}
          num
        />
      </div>

      {/* 백업 범위 선택 */}
      <div className="card" style={{marginTop:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <div>
            <h3 style={{fontSize:15,fontWeight:700}}>백업 범위</h3>
            <p style={{fontSize:13,color:'var(--text-3)',marginTop:4}}>
              포함할 모듈을 선택하세요. 공통 설정·업로드 로그는 항상 포함됩니다.
            </p>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button className="btn sm" onClick={() => setAllScopes(true)} disabled={!ready}>전체 선택</button>
            <button className="btn sm" onClick={() => setAllScopes(false)} disabled={!ready}>모두 해제</button>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column'}}>
          {MODULE_KEYS.map((key, i) => {
            const g = MODULE_GROUPS[key];
            const count = stats ? g.stores.reduce((s, n) => s + (stats[n] || 0), 0) : 0;
            const last = i === MODULE_KEYS.length - 1;
            return (
              <div key={key} style={{
                display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,
                padding:'14px 0',
                borderBottom: last ? 'none' : '1px solid var(--border)',
              }}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,display:'flex',alignItems:'center',gap:8}}>
                    {g.label}
                    <span className="num" style={{fontSize:12,fontWeight:500,color:'var(--text-3)'}}>
                      ({formatNumber(count)}건)
                    </span>
                  </div>
                  <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>{g.desc}</div>
                </div>
                <Toggle value={scopes[key]} onChange={() => toggleScope(key)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* 최근 백업 이력 */}
      <div className="card" style={{marginTop:16}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:4}}>최근 백업 이력</h3>
        <p style={{fontSize:12,color:'var(--text-3)',marginBottom:16}}>
          이 브라우저에서 실행한 백업 기록입니다. 실제 백업 파일은 다운로드한 위치에 저장되어 있습니다.
        </p>

        {history.length === 0 ? (
          <div style={{padding:'24px 0',textAlign:'center',color:'var(--text-3)',fontSize:13}}>
            아직 백업 이력이 없습니다.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width:120}}>백업 ID</th>
                  <th style={{width:170}}>일시</th>
                  <th>범위</th>
                  <th style={{width:100,textAlign:'right'}}>행 수</th>
                  <th>파일명</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td className="num" style={{color:'var(--text-3)',fontSize:12}}>{h.id}</td>
                    <td className="num" style={{fontSize:12}}>{new Date(h.at).toLocaleString('ko-KR')}</td>
                    <td style={{fontSize:12}}>
                      {(h.scopes || []).map(k => MODULE_GROUPS[k]?.label || k).join(', ') || '전체'}
                    </td>
                    <td className="num" style={{textAlign:'right'}}>{formatNumber(h.totalRows)}</td>
                    <td className="num" style={{fontSize:11,color:'var(--text-3)'}}>{h.fileName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* v2 마이그레이션 안내 */}
      <div className="card" style={{marginTop:16,background:'var(--accent-soft)',borderColor:'var(--accent-soft)'}}>
        <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
          <Icon.alert style={{width:16,height:16,color:'var(--accent)',marginTop:2,flex:'0 0 16px'}}/>
          <div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.6}}>
            <b>v2 데이터를 v3로 이전</b>하려면 v2의 백업 파일을 <b>설정 / 백업 → 데이터 복원</b>에서 업로드하세요.
            <br/>v2와 v3는 별도 IndexedDB라 직접 공유되지 않습니다.
          </div>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   하위 컴포넌트
============================================================ */

function SummaryCard({ label, value, sub, num = false }) {
  return (
    <div className="card" style={{padding:'18px 22px'}}>
      <div style={{fontSize:12,color:'var(--text-3)',marginBottom:6}}>{label}</div>
      <div className={num ? 'num' : ''} style={{fontSize:20,fontWeight:700,marginBottom:4}}>{value}</div>
      {sub && (
        <div style={{fontSize:11,color:'var(--text-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sub}</div>
      )}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      aria-pressed={value}
      style={{
        width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',
        background:value ? 'var(--accent)' : 'var(--border-strong)',
        transition:'background 200ms',position:'relative',flex:'0 0 auto',
      }}
    >
      <span style={{
        position:'absolute',top:3,left:value ? 22 : 3,
        width:18,height:18,borderRadius:'50%',background:'white',transition:'left 200ms',
      }} />
    </button>
  );
}

/** ISO 시각 → "방금 전" / "10분 전" / "어제" 같은 상대 표시 */
function formatRelative(iso) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '-';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}
