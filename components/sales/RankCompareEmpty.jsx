'use client';
import { Icon } from '@/components/icons';

/**
 * RankCompareEmpty — rank-compare 페이지 빈 상태 (업로드된 판매량 없음)
 */
export function RankCompareEmpty() {
  return (
    <div className="card" style={{
      marginTop:24, padding:'48px 24px', textAlign:'center',
      display:'flex', flexDirection:'column', alignItems:'center', gap:12,
    }}>
      <Icon.chart style={{width:48, height:48, color:'var(--text-4)'}}/>
      <div style={{fontSize:15, fontWeight:700}}>아직 업로드된 판매량이 없습니다</div>
      <div style={{fontSize:13, color:'var(--text-3)'}}>
        판매량을 업로드하면 두 기간을 비교할 수 있어요.
      </div>
      <a className="btn primary sm" href="/menu-sales/upload" style={{marginTop:8}}>
        <Icon.upload style={{width:14, height:14}}/> 판매량 업로드
      </a>
    </div>
  );
}
