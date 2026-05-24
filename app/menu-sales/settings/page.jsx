'use client';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  return (
    <main className="main">
      <PageHeader
        breadcrumb={["메뉴 판매량", "설정"]}
        title="메뉴판매량 설정"
        sub="분류 규칙, 카테고리, 제외 품목 등을 관리하세요"
        actions={<button className="btn primary" onClick={()=>showToast('규칙 추가 (데모)','info')}><Icon.plus style={{width:14,height:14}}/>규칙 추가</button>}
      />
      <div className="card" style={{marginTop:24,minHeight:300,display:'grid',placeItems:'center'}}>
        <div style={{textAlign:'center',color:'var(--text-4)'}}>
          <div className="empty-icon-wrap"><Icon.gear style={{width:32,height:32}}/></div>
          <div style={{fontWeight:600,marginBottom:4}}>설정 화면이 여기에 표시돼요</div>
          <div style={{fontSize:13}}>분류 규칙, 카테고리, 별칭, 제외 품목 등을 관리하세요.</div>
        </div>
      </div>
    </main>
  );
}
