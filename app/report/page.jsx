'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  const title = "보고서센터";
  const bc = ["보고서센터"];
  const router = useRouter();

  const reports=[
    {id:'report-sales',label:'판매량 보고서',desc:'기간별 메뉴 판매량 분석 및 비교',icon:'chart',href:'/report/sales',color:'#3182F6'},
    {id:'report-cost',label:'원가계산 보고서',desc:'원가율 추이 및 위험 메뉴 리포트',icon:'calc',href:'/report/cost',color:'#8B5CF6'},
    {id:'report-price',label:'제때 가격 보고서',desc:'제때 단가 변동 이력 및 영향 분석',icon:'tag',href:'/report/price',color:'#F97316'},
    {id:'report-shipment',label:'출고량 보고서',desc:'범용 상품 출고량 기간별 비교',icon:'box',href:'/report/shipment',color:'#10B981'},
  ];
  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title} sub="보고서를 생성하고 다운로드하세요"
        actions={<button className="btn primary" onClick={()=>showToast('보고서 생성 페이지로 이동해요','info')}><Icon.plus style={{width:14,height:14}}/>새 보고서 생성</button>}
      />
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16,marginTop:24}}>
        {reports.map(r=>(
          <div key={r.id} className="card card-lift" style={{cursor:'pointer'}} onClick={()=>router.push(r.href)}>
            <div style={{width:48,height:48,borderRadius:14,background:r.color+'22',color:r.color,display:'grid',placeItems:'center',marginBottom:14}}>
              <Icon.chart style={{width:24,height:24}}/>
            </div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{r.label}</div>
            <div style={{fontSize:13,color:'var(--text-2)'}}>{r.desc}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
