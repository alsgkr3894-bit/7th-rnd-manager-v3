'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB, clearStore, ALL_STORES, DB_NAME, DB_VERSION, hasStore, deleteDatabase, collectStoreStats } from '@/lib/db';
import { formatNumber } from '@/lib/format';
import { getSetting, setSetting } from '@/lib/settings';
import { Toggle } from '@/components/ui/Toggle';

/**
 * 시스템 설정 페이지
 *
 * 구성:
 *   1. 환경 설정 (다크 모드, 화면 밀도)
 *   2. 원가 계산 정책 (자동 재계산 / 미연동 차단 / 반올림 방식)
 *   3. 알림 (미매칭 / 원가율 35% 초과)
 *   4. 지역 / 언어 (정보 표시, read-only)
 *   5. 앱 정보
 *   6. 저장소 상태
 *   7. 위험 영역 (모든 데이터 초기화)
 */

const APP_VERSION = '0.1.0';

export default function Page() {
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingRecreate, setConfirmingRecreate] = useState(false);

  const SETTING_KEYS = ['theme', 'density', 'autoRecalc', 'strictPosting', 'roundMode', 'unmatchedAlert', 'costRateAlert'];
  const [settings, setSettings] = useState(() =>
    Object.fromEntries(SETTING_KEYS.map(k => [k, getSetting(k)]))
  );

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        setReady(true);
        setStats(await collectStoreStats());
      } catch (err) {
        console.error('[Settings/System] DB 초기화 실패:', err);
        showToast('DB 초기화에 실패했습니다.', 'err');
      }
    })();
  }, []);

  async function refreshStats() {
    setStats(await collectStoreStats());
  }

  function updateSetting(key, value, message) {
    setSetting(key, value);
    setSettings(s => ({ ...s, [key]: value }));
    showToast(message, 'ok');
  }

  async function handleRecreate() {
    if (busy) return;
    setBusy(true);
    try {
      await deleteDatabase(DB_NAME);
      showToast('DB 삭제 완료. 새로고침합니다…', 'ok');
      // 1초 후 자동 새로고침 — 새 페이지 로드 시 최신 schema로 DB 자동 생성
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error('[Recreate] 실패:', err);
      showToast('DB 재생성 실패: ' + err.message, 'err');
      setBusy(false);
    }
  }

  async function handleReset() {
    if (busy) return;
    setBusy(true);
    try {
      for (const name of ALL_STORES) {
        if (!hasStore(name)) continue;
        try { await clearStore(name); } catch (err) { console.warn(`[Reset] ${name} skip:`, err); }
      }
      await refreshStats();
      setConfirmingReset(false);
      showToast('모든 데이터가 초기화되었습니다.', 'ok');
    } catch (err) {
      console.error('[Reset] 실패:', err);
      showToast('초기화 중 오류가 발생했습니다.', 'err');
    } finally {
      setBusy(false);
    }
  }

  const totalRows = stats ? Object.values(stats).reduce((s, n) => s + n, 0) : 0;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["설정 / 백업", "시스템 설정"]}
        title="시스템 설정"
        sub="환경, 원가 정책, 알림 등을 관리하세요. 변경은 즉시 적용됩니다."
      />

      {/* 1. 환경 설정 */}
      <SettingsGroup title="환경 설정" style={{marginTop:24}}>
        <SettingsRow
          name="다크 모드"
          desc="어두운 배경으로 전환합니다"
          control={<Toggle value={settings.theme === 'dark'} onChange={(on) => updateSetting('theme', on ? 'dark' : 'light', '다크 모드 ' + (on ? '설정' : '해제'))} />}
        />
        <SettingsRow
          name="화면 밀도"
          desc="표·카드 간격을 조절합니다"
          control={
            <Segmented
              value={settings.density}
              options={[{value:'normal',label:'기본'},{value:'compact',label:'촘촘'}]}
              onChange={(v) => updateSetting('density', v, v === 'compact' ? '촘촘 밀도 적용' : '기본 밀도 적용')}
            />
          }
          last
        />
      </SettingsGroup>

      {/* 2. 알림 (자주 ON/OFF — 환경 다음으로 자주 변경) */}
      <SettingsGroup title="알림">
        <SettingsRow
          name="미매칭 메뉴 알림"
          desc="판매량 업로드 후 매칭되지 않은 메뉴가 있으면 홈에 알림을 표시합니다."
          control={<Toggle value={settings.unmatchedAlert === 'on'} onChange={(on) => updateSetting('unmatchedAlert', on ? 'on' : 'off', '미매칭 알림 ' + (on ? 'ON' : 'OFF'))} />}
        />
        <SettingsRow
          name="원가율 35% 초과 알림"
          desc="재계산 후 원가율 35% 초과 메뉴가 새로 생기면 빨간 알림을 표시합니다."
          control={<Toggle value={settings.costRateAlert === 'on'} onChange={(on) => updateSetting('costRateAlert', on ? 'on' : 'off', '원가율 알림 ' + (on ? 'ON' : 'OFF'))} />}
          last
        />
      </SettingsGroup>

      {/* 3. 원가 계산 정책 (한 번 설정 후 거의 변경 없음 — 사업 정책) */}
      <SettingsGroup title="원가 계산 정책">
        <SettingsRow
          name="단가 변경 시 원가표 자동 재계산"
          desc="제때 단가가 변경되면 모든 원가표를 자동으로 다시 계산합니다."
          control={<Toggle value={settings.autoRecalc === 'on'} onChange={(on) => updateSetting('autoRecalc', on ? 'on' : 'off', '자동 재계산 ' + (on ? 'ON' : 'OFF'))} />}
        />
        <SettingsRow
          name="미연동 재료 차단"
          desc="제때 단가에 등록되지 않은 재료가 포함된 메뉴는 원가표 발행을 차단합니다."
          control={<Toggle value={settings.strictPosting === 'on'} onChange={(on) => updateSetting('strictPosting', on ? 'on' : 'off', '미연동 차단 ' + (on ? 'ON' : 'OFF'))} />}
        />
        <SettingsRow
          name="원가 반올림 방식"
          desc="g·개당 단가에서 원 단위 환산 시 적용"
          control={
            <Segmented
              value={settings.roundMode}
              options={[
                {value:'round',label:'반올림'},
                {value:'ceil', label:'올림'},
                {value:'floor',label:'내림'},
              ]}
              onChange={(v) => updateSetting('roundMode', v, ({round:'반올림',ceil:'올림',floor:'내림'}[v]) + ' 적용')}
            />
          }
          last
        />
      </SettingsGroup>

      {/* 4. 지역 / 언어 (read-only 정보 표시) */}
      <SettingsGroup title="지역 / 언어">
        <SettingsRow
          name="언어"
          desc="UI 텍스트 표시 언어 (현재 한국어 고정)"
          control={<StaticValue>한국어</StaticValue>}
        />
        <SettingsRow
          name="시간대"
          desc="모든 일시 표시·자동 작업의 기준 시간대"
          control={<StaticValue>Asia/Seoul (KST · UTC+9)</StaticValue>}
        />
        <SettingsRow
          name="통화"
          desc="원가·판매가·매출 표시 통화"
          control={<StaticValue>원 (KRW)</StaticValue>}
          last
        />
      </SettingsGroup>

      {/* 5. 앱 정보 */}
      <div className="card" style={{marginTop:16}}>
        <h2 style={{fontSize:15,fontWeight:700,marginBottom:16}}>앱 정보</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:24}}>
          <InfoCell label="앱 버전" value={APP_VERSION} />
          <InfoCell label="DB 이름" value={DB_NAME} mono />
          <InfoCell label="DB 버전" value={String(DB_VERSION)} />
          <InfoCell label="환경" value="개발 (localhost)" />
        </div>
      </div>

      {/* 6. 저장소 상태 */}
      <div className="card" style={{marginTop:16}}>
        <h2 style={{fontSize:15,fontWeight:700,marginBottom:16}}>저장소 상태</h2>
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
              <button className="btn" onClick={refreshStats} disabled={busy}>새로고침</button>
            </div>
          </>
        )}
      </div>

      {/* 7. 위험 영역 */}
      <div className="card" style={{marginTop:16,borderColor:'var(--negative-soft)'}}>
        <h2 style={{fontSize:15,fontWeight:700,marginBottom:16,color:'var(--negative)'}}>위험 영역</h2>

        {/* 모든 데이터 초기화 */}
        <div style={{paddingBottom:16,borderBottom:'1px solid var(--border)'}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>모든 데이터 초기화</div>
          <p style={{fontSize:13,color:'var(--text-2)',marginBottom:12}}>
            모든 store의 데이터를 삭제합니다. schema는 유지되며 빈 store로 남습니다.
            <br/>백업이 필요한 경우 먼저 <b>데이터 백업</b> 메뉴에서 다운로드하세요.
          </p>
          <DangerConfirm
            label="모든 데이터 초기화"
            confirmMsg={`정말 모든 데이터를 삭제할까요? (${formatNumber(totalRows)}건)`}
            confirmLabel={busy ? '삭제 중…' : '정말 삭제'}
            isOpen={confirmingReset}
            onOpen={() => setConfirmingReset(true)}
            onClose={() => setConfirmingReset(false)}
            onConfirm={handleReset}
            disabled={!ready || busy || totalRows === 0}
            busy={busy}
          />
        </div>

        {/* DB 완전 재생성 */}
        <div style={{paddingTop:16}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>DB 완전 재생성</div>
          <p style={{fontSize:13,color:'var(--text-2)',marginBottom:12}}>
            DB 자체를 삭제하고 최신 schema로 새로 생성합니다.
            <br/>schema 업그레이드가 누락된 경우(<code>NotFoundError</code>) 해결 가능.
            <br/>실행 후 페이지가 자동 새로고침되며 모든 데이터는 사라집니다.
          </p>
          <DangerConfirm
            label="DB 완전 재생성"
            confirmMsg="DB를 삭제하고 새로 만들까요? (모든 데이터 사라짐)"
            confirmLabel={busy ? '재생성 중…' : '정말 재생성'}
            isOpen={confirmingRecreate}
            onOpen={() => setConfirmingRecreate(true)}
            onClose={() => setConfirmingRecreate(false)}
            onConfirm={handleRecreate}
            disabled={!ready || busy}
            busy={busy}
          />
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   하위 컴포넌트
============================================================ */

function SettingsGroup({ title, children, style }) {
  return (
    <div className="card" style={{marginTop: style?.marginTop ?? 16}}>
      <h2 style={{fontSize:15,fontWeight:700,marginBottom:4}}>{title}</h2>
      <div>{children}</div>
    </div>
  );
}

function SettingsRow({ name, desc, control, last }) {
  return (
    <div style={{
      display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,
      padding:'14px 0',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:14}}>{name}</div>
        <div style={{fontSize:12,color:'var(--text-3)',marginTop:2}}>{desc}</div>
      </div>
      <div style={{flex:'0 0 auto'}}>{control}</div>
    </div>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div style={{display:'flex',gap:6}}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding:'6px 14px',fontSize:13,fontWeight:600,cursor:'pointer',
              border:'1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
              borderRadius:8,
              background: active ? 'var(--accent-soft)' : 'var(--surface)',
              color: active ? 'var(--accent-text)' : 'var(--text-2)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function StaticValue({ children }) {
  return (
    <div style={{
      fontSize:13,fontWeight:600,color:'var(--text-2)',
      padding:'6px 12px',borderRadius:8,
      background:'var(--surface-2)',border:'1px solid var(--border)',
    }}>
      {children}
    </div>
  );
}

function DangerConfirm({ label, confirmMsg, confirmLabel, isOpen, onOpen, onClose, onConfirm, disabled, busy }) {
  if (!isOpen) {
    return (
      <button className="btn" onClick={onOpen} disabled={disabled}
        style={{color:'var(--negative)', borderColor:'var(--negative)'}}>
        {label}
      </button>
    );
  }
  return (
    <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
      <span style={{color:'var(--negative)', fontWeight:600, fontSize:13}}>{confirmMsg}</span>
      <button className="btn" disabled={busy} onClick={onClose}>취소</button>
      <button className="btn primary" disabled={busy} onClick={onConfirm}
        style={{background:'var(--negative)'}}>
        {confirmLabel}
      </button>
    </div>
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
