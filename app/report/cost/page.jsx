'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  const title = "원가계산 보고서";
  const bc = ["보고서센터","원가계산 보고서"];
  const router = useRouter();

  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title} sub="기간 설정 후 보고서를 생성하세요"
        actions={<><button className="btn" onClick={()=>showToast('임시 저장됐어요','ok')}><Icon.doc style={{width:14,height:14}}/>임시 저장</button><button className="btn primary" onClick={()=>showToast('보고서 생성 완료 — 다운로드 준비됐어요','ok')}><Icon.download style={{width:14,height:14}}/>보고서 생성</button></>}
      />
      <div className="card" style={{marginTop:24}}>
        <div className="card-header">
          <div className="card-title">기간 설정</div>
        </div>
        <div style={{display:'flex',gap:12,padding:'16px 0'}}>
          {['2026년 4월','2026년 5월','최근 3개월','최근 6개월'].map(l=>(
            <button key={l} className="chip">{l}</button>
          ))}
        </div>
        <div style={{height:200,background:'var(--surface-2)',borderRadius:12,display:'grid',placeItems:'center',color:'var(--text-4)',fontSize:14}}>
          미리보기 차트 영역
        </div>
      </div>
    </main>
  );
}
