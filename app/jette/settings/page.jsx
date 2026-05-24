'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  const title = "제때 상품 관리 설정";
  const bc = ["제때상품관리","설정"];

  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title} sub="관리대상 제품 목록과 출고량 분류 기준을 관리하세요"
        actions={<><button className="btn" onClick={()=>showToast('양식 다운로드 완료','ok')}><Icon.download style={{width:14,height:14}}/>양식 다운로드</button><button className="btn primary" onClick={()=>showToast('제품을 선택해주세요 (데모)','info')}><Icon.plus style={{width:14,height:14}}/>제품 추가</button></>}
      />
      <div className="card" style={{marginTop:24,minHeight:300,display:'grid',placeItems:'center'}}>
        <div style={{textAlign:'center',color:'var(--text-4)'}}>
          <div className="empty-icon-wrap"><Icon.gear style={{width:32,height:32}}/></div>
          <div style={{fontWeight:600,marginBottom:4}}>{title} 데이터가 여기에 표시돼요</div>
          <div style={{fontSize:13}}>관리품목/범용상품 분류를 설정하세요.</div>
        </div>
      </div>
    </main>
  );
}
