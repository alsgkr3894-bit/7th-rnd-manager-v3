'use client';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  return (
    <main className="main">
      <PageHeader
        breadcrumb={["원가계산", "종합전메뉴원가"]}
        title="종합전메뉴원가"
        sub="모든 메뉴(피자/1인피자/사이드/세트박스)의 원가를 한 화면에서 비교"
        actions={<button className="btn" onClick={()=>showToast('엑셀 내보내기 (데모)','ok')}><Icon.download style={{width:14,height:14}}/>엑셀 내보내기</button>}
      />
      <div className="card" style={{marginTop:24,minHeight:300,display:'grid',placeItems:'center'}}>
        <div style={{textAlign:'center',color:'var(--text-4)'}}>
          <div className="empty-icon-wrap"><Icon.calc style={{width:32,height:32}}/></div>
          <div style={{fontWeight:600,marginBottom:4}}>전체 메뉴 원가 종합이 여기에 표시돼요</div>
          <div style={{fontSize:13}}>각 메뉴의 종합 원가표 데이터를 통합 표시합니다.</div>
        </div>
      </div>
    </main>
  );
}
