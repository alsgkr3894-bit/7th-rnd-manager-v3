'use client';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  return (
    <main className="main">
      <PageHeader
        breadcrumb={["영양성분", "원산지 정보"]}
        title="원산지 정보"
        sub="식재료별 원산지 마스터 및 메뉴별 원산지 연결을 관리하세요"
        actions={<button className="btn primary" onClick={()=>showToast('원산지 추가 (데모)','info')}><Icon.plus style={{width:14,height:14}}/>원산지 추가</button>}
      />
      <div className="card" style={{marginTop:24,minHeight:300,display:'grid',placeItems:'center'}}>
        <div style={{textAlign:'center',color:'var(--text-4)'}}>
          <div className="empty-icon-wrap"><Icon.tag style={{width:32,height:32}}/></div>
          <div style={{fontWeight:600,marginBottom:4}}>원산지 정보가 여기에 표시돼요</div>
          <div style={{fontSize:13}}>식재료별 원산지(국가/지역) 마스터를 관리합니다.</div>
        </div>
      </div>
    </main>
  );
}
