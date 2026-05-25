'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { initDB } from '@/lib/db';
import { seedManagedProductsIfEmpty } from '@/lib/shipment';
import { ManagedProductsCard } from '@/components/jette/ManagedProductsCard';

export default function Page() {
  const [ready, setReady] = useState(false);

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

      {/* 보류 안내 */}
      <div className="card" style={{
        marginTop:16, padding:'16px 18px',
        background:'var(--surface-2)',
        display:'flex', gap:12, alignItems:'flex-start',
      }}>
        <Icon.alert style={{width:16, height:16, color:'var(--text-3)', marginTop:2, flex:'0 0 16px'}}/>
        <div style={{fontSize:13, color:'var(--text-2)', lineHeight:1.6}}>
          <b style={{color:'var(--text-1)'}}>추후 추가될 설정 항목</b>
          <ul style={{margin:'6px 0 0', paddingLeft:20, color:'var(--text-3)'}}>
            <li>가격 인상/인하 알림 임계값 (% 기준)</li>
            <li>단가 업데이트 시 원가표 자동 재계산</li>
            <li>신규 제품 자동 등록 / 수동 승인</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
