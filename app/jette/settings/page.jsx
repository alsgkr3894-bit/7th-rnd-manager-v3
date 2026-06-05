'use client';
import { useEffect, useState, useRef } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { seedManagedProductsIfEmpty } from '@/lib/shipment';
import { ManagedProductsCard } from '@/components/jette/ManagedProductsCard';
import { Toggle } from '@/components/ui/Toggle';

const LS_KEY = 'v3:jette-settings';

const DEFAULT_SETTINGS = {
  priceAlertThreshold: 5,     // 가격 인상/인하 알림 임계값 (%)
  autoRecalcOnUpdate: false,  // 단가 업데이트 시 원가표 자동 재계산
  autoRegisterNew: 'manual',  // 'auto' | 'manual' — 신규 제품 자동 등록 vs 수동 승인
};

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export default function Page() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(() => {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
    return loadSettings();
  });
  const isFirstRender = useRef(true);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        await seedManagedProductsIfEmpty();
        setReady(true);
      } catch (err) {
        console.error('[jette-settings] 초기화 실패:', err);
      }
    })();
  }, []);

  // 설정 변경 시 localStorage 저장 + 토스트
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(settings));
    } catch {}
    showToast('저장됐어요', 'ok');
  }, [settings]);

  function update(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['제때상품관리', '제때 상품 관리 설정']}
        title="제때 상품 관리 설정"
        sub="출고량 집계 대상 제품을 관리합니다. 대상 외 제품은 자동 제외됩니다."
      />

      <div className="info-banner info-accent" style={{marginTop:16}}>
        <div className="info-banner-ico" style={{background:'var(--accent-soft)', color:'var(--accent-text)'}}>
          <Icon.alert style={{width:16, height:16}}/>
        </div>
        <div>
          <b>제때 가격 데이터 단일 기준 원칙</b><br/>
          원가계산 모듈은 제때 가격 비교 페이지의 최신 단가만 참조합니다.
          원가계산 탭에서 가격을 별도 업로드하지 마세요. (CLAUDE.md 정책)
        </div>
      </div>

      {ready ? (
        <ManagedProductsCard />
      ) : (
        <div className="card" style={{
          marginTop:16, height:120, display:'grid', placeItems:'center',
          color:'var(--text-4)', fontSize:13,
        }}>
          로딩 중…
        </div>
      )}

      {/* 알림 및 자동화 설정 */}
      <div className="card" style={{marginTop:16, padding:'18px 20px'}}>
        <div style={{fontWeight:700, fontSize:14, color:'var(--text-1)', marginBottom:16}}>
          알림 및 자동화 설정
        </div>

        {/* 가격 인상/인하 알림 임계값 */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          paddingBottom:14, borderBottom:'1px solid var(--divider)', marginBottom:14,
        }}>
          <div>
            <div style={{fontSize:13, fontWeight:600, color:'var(--text-1)'}}>
              가격 인상/인하 알림 임계값
            </div>
            <div style={{fontSize:12, color:'var(--text-3)', marginTop:2}}>
              이 % 이상 변동 시 강조 표시합니다
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:6}}>
            <input
              type="number"
              min={1}
              max={50}
              step={1}
              value={settings.priceAlertThreshold}
              onChange={e => {
                const v = Math.max(1, Math.min(50, Number(e.target.value) || 1));
                update('priceAlertThreshold', v);
              }}
              style={{
                width:60, textAlign:'right',
                border:'1px solid var(--border)',
                borderRadius:6, padding:'5px 8px',
                fontSize:13, background:'var(--surface-1)',
                color:'var(--text-1)',
              }}
            />
            <span style={{fontSize:13, color:'var(--text-2)'}}>%</span>
          </div>
        </div>

        {/* 단가 업데이트 시 원가표 자동 재계산 */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          paddingBottom:14, borderBottom:'1px solid var(--divider)', marginBottom:14,
        }}>
          <div>
            <div style={{fontSize:13, fontWeight:600, color:'var(--text-1)'}}>
              단가 업데이트 시 원가표 자동 재계산
            </div>
            <div style={{fontSize:12, color:'var(--text-3)', marginTop:2}}>
              제때 가격 파일 업로드 시 원가 계산 결과를 자동으로 갱신합니다
            </div>
          </div>
          <Toggle value={settings.autoRecalcOnUpdate} onChange={v => update('autoRecalcOnUpdate', v)} />
        </div>

        {/* 신규 제품 자동 등록 / 수동 승인 */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:13, fontWeight:600, color:'var(--text-1)'}}>
              신규 제품 등록 방식
            </div>
            <div style={{fontSize:12, color:'var(--text-3)', marginTop:2}}>
              가격 파일에 처음 등장한 제품 처리 방식
            </div>
          </div>
          <div style={{display:'flex', gap:6}}>
            {[
              { value:'manual', label:'수동 승인' },
              { value:'auto',   label:'자동 등록' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => update('autoRegisterNew', opt.value)}
                style={{
                  padding:'5px 12px', fontSize:12, fontWeight:600,
                  borderRadius:6, cursor:'pointer', border:'1px solid var(--border)',
                  background: settings.autoRegisterNew === opt.value
                    ? 'var(--accent)' : 'var(--surface-2)',
                  color: settings.autoRegisterNew === opt.value
                    ? '#fff' : 'var(--text-2)',
                  transition:'background .15s, color .15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
