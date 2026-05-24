'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB, exportAll, ALL_STORES, getAll } from '@/lib/db';
import { downloadJson, makeFileName } from '@/lib/download';
import { formatNumber } from '@/lib/format';

/**
 * 데이터 백업 페이지 — JSON 형태로 전체 store export.
 *
 * v2의 백업 파일도 같은 구조라 v3에서 복원 가능 (settings/restore).
 * v2 → v3 데이터 이전의 핵심 흐름.
 */
export default function Page() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);

  // 페이지 로드 시 DB 초기화 + 현재 데이터 개수 조회
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

  async function handleBackup() {
    if (busy) return;
    setBusy(true);
    try {
      const data = await exportAll();
      const fileName = makeFileName('rnd-manager-backup', 'json');
      downloadJson(data, fileName);
      showToast(`백업 완료 — ${fileName}`, 'ok');
    } catch (err) {
      console.error('[Backup] 백업 실패:', err);
      showToast('백업 중 오류가 발생했습니다.', 'err');
    } finally {
      setBusy(false);
    }
  }

  const totalRows = stats
    ? Object.values(stats).reduce((sum, n) => sum + n, 0)
    : 0;
  const storesWithData = stats
    ? Object.entries(stats).filter(([, n]) => n > 0)
    : [];

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["설정 / 백업", "데이터 백업"]}
        title="데이터 백업"
        sub="현재 데이터를 JSON 파일로 다운로드 (v3 → 다른 환경 이전 / 복구용)"
        actions={
          <button
            className="btn primary"
            disabled={!ready || busy}
            onClick={handleBackup}
          >
            <Icon.download style={{width:14,height:14}}/>
            {busy ? '백업 중…' : '백업 파일 다운로드'}
          </button>
        }
      />

      {/* 요약 */}
      <div className="card" style={{marginTop:24}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>현재 데이터 현황</h3>
        {!ready ? (
          <div style={{color:'var(--text-3)'}}>DB 초기화 중…</div>
        ) : (
          <>
            <div style={{display:'flex',gap:32,marginBottom:20,padding:'16px 0',borderBottom:'1px solid var(--border)'}}>
              <div>
                <div style={{fontSize:12,color:'var(--text-3)',marginBottom:4}}>저장된 항목 (전체)</div>
                <div className="num" style={{fontSize:24,fontWeight:700}}>{formatNumber(totalRows)}건</div>
              </div>
              <div>
                <div style={{fontSize:12,color:'var(--text-3)',marginBottom:4}}>데이터 있는 store</div>
                <div className="num" style={{fontSize:24,fontWeight:700}}>{storesWithData.length} / {ALL_STORES.length}</div>
              </div>
            </div>

            {storesWithData.length === 0 ? (
              <div style={{color:'var(--text-3)',padding:'16px 0'}}>
                저장된 데이터가 없습니다. 데이터 업로드 후 백업하세요.
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
                {storesWithData.map(([name, count]) => (
                  <div key={name} style={{padding:12,border:'1px solid var(--border)',borderRadius:8,background:'var(--surface-2)'}}>
                    <div style={{fontSize:12,color:'var(--text-3)',fontFamily:'monospace',marginBottom:4}}>{name}</div>
                    <div className="num" style={{fontSize:16,fontWeight:600}}>{formatNumber(count)}건</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 안내 */}
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
