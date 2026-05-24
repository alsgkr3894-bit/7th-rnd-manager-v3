'use client';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  return (
    <main className="main">
      <PageHeader
        breadcrumb={["영양성분", "표 출력"]}
        title="영양성분 / 원산지 / 알레르기 표 출력"
        sub="공시용 또는 매장 표시용 표를 한 번에 생성·다운로드"
        actions={<>
          <button className="btn" onClick={()=>showToast('미리보기 (데모)','info')}><Icon.doc style={{width:14,height:14}}/>미리보기</button>
          <button className="btn primary" onClick={()=>showToast('PDF 다운로드 (데모)','ok')}><Icon.download style={{width:14,height:14}}/>PDF 다운로드</button>
        </>}
      />
      <div className="card" style={{marginTop:24,minHeight:300,display:'grid',placeItems:'center'}}>
        <div style={{textAlign:'center',color:'var(--text-4)'}}>
          <div className="empty-icon-wrap"><Icon.doc style={{width:32,height:32}}/></div>
          <div style={{fontWeight:600,marginBottom:4}}>표 출력 미리보기가 여기에 표시돼요</div>
          <div style={{fontSize:13}}>메뉴 영양성분 + 원산지 + 알레르기 데이터를 통합 표로 생성합니다.</div>
        </div>
      </div>
    </main>
  );
}
