'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB, getAll, clearStore, ALL_STORES, DB_NAME, DB_VERSION } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getSetting, setSetting } from '@/lib/settings';

/**
 * 시스템 설정 — 앱/DB 정보 표시 + DB 초기화.
 *
 * 다크모드/밀도/알림 토글은 우측 상단 tweaks 패널에 있으므로 제거.
 * 이 페이지는 시스템 정보와 위험한 작업(DB 초기화) 전용.
 */

const APP_VERSION = '0.1.0';

export default function Page() {
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // 사용자 환경 설정 (localStorage)
  const [theme, setTheme] = useState('light');
  const [density, setDensity] = useState('normal');
  const [notifications, setNotifications] = useState('on');

  // 페이지 mount 시 현재 설정값 읽어오기
  useEffect(() => {
    setTheme(getSetting('theme'));
    setDensity(getSetting('density'));
    setNotifications(getSetting('notifications'));
  }, []);

  function updateSetting(key, value, setter, message) {
    setSetting(key, value);
    setter(value);
    showToast(message, 'ok');
  }

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        setReady(true);
        await refreshStats();
      } catch (err) {
        console.error('[Settings/System] DB 초기화 실패:', err);
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

  async function handleReset() {
    if (busy) return;
    setBusy(true);
    try {
      for (const name of ALL_STORES) {
        try {
          await clearStore(name);
        } catch (err) {
          console.warn(`[Settings/System] ${name} 초기화 실패 (skip):`, err);
        }
      }
      await refreshStats();
      setConfirmingReset(false);
      showToast('모든 데이터가 초기화되었습니다.', 'ok');
    } catch (err) {
      console.error('[Settings/System] 초기화 실패:', err);
      showToast('초기화 중 오류가 발생했습니다.', 'err');
    } finally {
      setBusy(false);
    }
  }

  const totalRows = stats
    ? Object.values(stats).reduce((sum, n) => sum + n, 0)
    : 0;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["설정 / 백업", "시스템 설정"]}
        title="시스템 설정"
        sub="앱 정보와 저장소 상태를 확인하고 데이터를 관리하세요"
      />

      {/* 환경 설정 */}
      <div className="card" style={{marginTop:24}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>환경 설정</h3>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* 다크모드 토글 */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
            <div>
              <div style={{fontWeight:700}}>다크 모드</div>
              <div style={{fontSize:13,color:'var(--text-3)',marginTop:2}}>어두운 배경으로 전환합니다</div>
            </div>
            <button
              onClick={() => updateSetting('theme', theme === 'dark' ? 'light' : 'dark', setTheme, '다크 모드가 ' + (theme === 'dark' ? '해제' : '설정') + '되었습니다')}
              style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',background:theme === 'dark' ? 'var(--accent)' : 'var(--border-strong)',transition:'background 200ms',position:'relative'}}
              aria-label="다크 모드 토글"
            >
              <span style={{position:'absolute',top:3,left:theme === 'dark' ? 22 : 3,width:18,height:18,borderRadius:'50%',background:'white',transition:'left 200ms'}}></span>
            </button>
          </div>

          {/* 화면 밀도 */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--border)',gap:16}}>
            <div>
              <div style={{fontWeight:700}}>화면 밀도</div>
              <div style={{fontSize:13,color:'var(--text-3)',marginTop:2}}>표·카드 간격을 조절합니다</div>
            </div>
            <div style={{display:'flex',gap:6}}>
              {[
                { value: 'normal',  label: '기본' },
                { value: 'compact', label: '촘촘' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateSetting('density', opt.value, setDensity, opt.label + ' 밀도가 적용되었습니다')}
                  style={{
                    padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: '1px solid ' + (density === opt.value ? 'var(--accent)' : 'var(--border)'),
                    borderRadius: 8,
                    background: density === opt.value ? 'var(--accent-soft)' : 'var(--surface)',
                    color: density === opt.value ? 'var(--accent-text)' : 'var(--text-2)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 알림 */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0'}}>
            <div>
              <div style={{fontWeight:700}}>알림</div>
              <div style={{fontSize:13,color:'var(--text-3)',marginTop:2}}>단가 변동·업로드 등 알림 표시 (향후 알림 시스템 연동)</div>
            </div>
            <button
              onClick={() => updateSetting('notifications', notifications === 'on' ? 'off' : 'on', setNotifications, '알림이 ' + (notifications === 'on' ? '해제' : '설정') + '되었습니다')}
              style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',background:notifications === 'on' ? 'var(--accent)' : 'var(--border-strong)',transition:'background 200ms',position:'relative'}}
              aria-label="알림 토글"
            >
              <span style={{position:'absolute',top:3,left:notifications === 'on' ? 22 : 3,width:18,height:18,borderRadius:'50%',background:'white',transition:'left 200ms'}}></span>
            </button>
          </div>
        </div>
      </div>

      {/* 앱 정보 */}
      <div className="card" style={{marginTop:16}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>앱 정보</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:24}}>
          <InfoCell label="앱 버전" value={APP_VERSION} />
          <InfoCell label="DB 이름" value={DB_NAME} mono />
          <InfoCell label="DB 버전" value={String(DB_VERSION)} />
          <InfoCell label="환경" value="개발 (localhost)" />
        </div>
      </div>

      {/* 저장소 상태 */}
      <div className="card" style={{marginTop:16}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>저장소 상태</h3>
        {!ready ? (
          <div style={{color:'var(--text-3)'}}>DB 초기화 중…</div>
        ) : (
          <>
            <div style={{display:'flex',gap:32,marginBottom:20,padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
              <InfoCell label="전체 저장 행" value={`${formatNumber(totalRows)}건`} big />
              <InfoCell label="정의된 store 수" value={`${ALL_STORES.length}개`} big />
              <InfoCell label="데이터 있는 store" value={`${stats ? Object.values(stats).filter(n => n > 0).length : 0}개`} big />
            </div>

            {stats && Object.values(stats).some(n => n > 0) ? (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
                {Object.entries(stats).filter(([, n]) => n > 0).map(([name, count]) => (
                  <div key={name} style={{padding:12,border:'1px solid var(--border)',borderRadius:8,background:'var(--surface-2)'}}>
                    <div style={{fontSize:12,color:'var(--text-3)',fontFamily:'monospace',marginBottom:4}}>{name}</div>
                    <div className="num" style={{fontSize:16,fontWeight:600}}>{formatNumber(count)}건</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{color:'var(--text-3)',padding:'8px 0'}}>저장된 데이터가 없습니다.</div>
            )}

            <div style={{marginTop:16,display:'flex',justifyContent:'flex-end'}}>
              <button className="btn" onClick={refreshStats} disabled={busy}>
                <Icon.chevDown style={{width:14,height:14,transform:'rotate(0deg)'}}/>
                새로고침
              </button>
            </div>
          </>
        )}
      </div>

      {/* 위험 영역: DB 초기화 */}
      <div className="card" style={{marginTop:16,borderColor:'var(--negative-soft)'}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:8,color:'var(--negative)'}}>위험 영역</h3>
        <p style={{fontSize:13,color:'var(--text-2)',marginBottom:16}}>
          모든 데이터를 삭제합니다. 백업이 필요한 경우 먼저 <b>데이터 백업</b> 메뉴에서 다운로드하세요.
        </p>
        {!confirmingReset ? (
          <button
            className="btn"
            onClick={() => setConfirmingReset(true)}
            disabled={!ready || busy || totalRows === 0}
            style={{color:'var(--negative)',borderColor:'var(--negative)'}}
          >
            모든 데이터 초기화
          </button>
        ) : (
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <span style={{color:'var(--negative)',fontWeight:600,fontSize:13}}>
              정말 모든 데이터를 삭제할까요? ({formatNumber(totalRows)}건)
            </span>
            <button className="btn" disabled={busy} onClick={() => setConfirmingReset(false)}>취소</button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={handleReset}
              style={{background:'var(--negative)'}}
            >
              {busy ? '삭제 중…' : '정말 삭제'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function InfoCell({ label, value, big = false, mono = false }) {
  return (
    <div>
      <div style={{fontSize:12,color:'var(--text-3)',marginBottom:4}}>{label}</div>
      <div className={mono ? 'num' : ''}
           style={{
             fontSize: big ? 22 : 14,
             fontWeight: big ? 700 : 600,
             fontFamily: mono ? 'monospace' : undefined,
           }}>
        {value}
      </div>
    </div>
  );
}
