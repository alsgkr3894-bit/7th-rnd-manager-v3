'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  const [tab, setTab] = useState('rank');

  return (
    <main className="main">
      <PageHeader
        breadcrumb={["메뉴 판매량", "순위 및 비교"]}
        title="순위 및 비교"
        sub="판매량 순위와 월별 비교를 한 곳에서 확인하세요"
        actions={<button className="btn" onClick={()=>showToast('엑셀 내보내기 (데모)','ok')}><Icon.download style={{width:14,height:14}}/>엑셀 내보내기</button>}
      />

      {/* 탭 */}
      <div style={{display:'flex',gap:4,marginTop:16,borderBottom:'1px solid var(--border)'}}>
        <button
          onClick={()=>setTab('rank')}
          style={{padding:'10px 20px',fontWeight:600,border:'none',background:'transparent',cursor:'pointer',color:tab==='rank'?'var(--accent)':'var(--text-3)',borderBottom:tab==='rank'?'2px solid var(--accent)':'2px solid transparent',marginBottom:-1}}>
          판매량 순위
        </button>
        <button
          onClick={()=>setTab('compare')}
          style={{padding:'10px 20px',fontWeight:600,border:'none',background:'transparent',cursor:'pointer',color:tab==='compare'?'var(--accent)':'var(--text-3)',borderBottom:tab==='compare'?'2px solid var(--accent)':'2px solid transparent',marginBottom:-1}}>
          월별 비교
        </button>
      </div>

      <div className="card" style={{marginTop:24,minHeight:300,display:'grid',placeItems:'center'}}>
        <div style={{textAlign:'center',color:'var(--text-4)'}}>
          <div className="empty-icon-wrap"><Icon.chart style={{width:32,height:32}}/></div>
          <div style={{fontWeight:600,marginBottom:4}}>
            {tab === 'rank' ? '판매량 순위가 여기에 표시돼요' : '월별 비교가 여기에 표시돼요'}
          </div>
          <div style={{fontSize:13}}>데이터를 업로드하면 자동으로 분석됩니다.</div>
        </div>
      </div>
    </main>
  );
}
