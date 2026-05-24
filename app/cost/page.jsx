'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  const title = "원가계산";
  const bc = ["원가계산"];

  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title} sub="데이터를 조회하고 관리하세요"
        actions={<><button className="btn" onClick={()=>showToast('양식 다운로드 완료','ok')}><Icon.download style={{width:14,height:14}}/>양식 다운로드</button><button className="btn primary" onClick={()=>showToast('파일을 선택해주세요 (데모)','info')}><Icon.upload style={{width:14,height:14}}/>파일 업로드</button></>}
      />
      <div className="card" style={{marginTop:24,minHeight:300,display:'grid',placeItems:'center'}}>
        <div style={{textAlign:'center',color:'var(--text-4)'}}>
          <div className="empty-icon-wrap"><Icon.doc style={{width:32,height:32}}/></div>
          <div style={{fontWeight:600,marginBottom:4}}>{title} 데이터가 여기에 표시돼요</div>
          <div style={{fontSize:13}}>파일을 업로드하거나 제때 연동을 확인하세요.</div>
        </div>
      </div>
    </main>
  );
}
