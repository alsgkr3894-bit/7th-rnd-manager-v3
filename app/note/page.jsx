'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  const title = "메뉴개발노트";
  const bc = ["메뉴개발노트","노트 목록"];
  const router = useRouter();

  const notes=[
    {id:1,title:'황성한우셰림프 와사비마요 조합',menu:'황성한우셰림프',date:'2026.05.22',tags:['재테스트','보고예정'],summary:'와사비마요 + 235도 4분50초. 감칠한 맛.'},
    {id:2,title:'고르곤졸라 꿀 드리즐 테스트',menu:'고르곤졸라',date:'2026.05.20',tags:['완료'],summary:'꿀 10g 추가시 원가율 +1.2%p. 판가 조정 검토 필요.'},
    {id:3,title:'포테이토피자 베이컨 추가 비율',menu:'포테이토피자',date:'2026.05.18',tags:['진행중'],summary:'베이컨 30g→40g 변경. 원가율 38.2%로 상승.'},
    {id:4,title:'씬도우 크런치 개선',menu:'씬도우',date:'2026.05.15',tags:['완료'],summary:'밀가루 배합 변경. 크런치 +15% 향상.'},
  ];
  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title} sub="메뉴 R&D 테스트 기록 · 개발 노트 관리"
        actions={<button className="btn primary" onClick={()=>router.push('/note/write')}><Icon.plus style={{width:14,height:14}}/>노트 작성</button>}
      />
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16,marginTop:24}}>
        {notes.map(n=>(
          <div key={n.id} className="card card-lift" style={{cursor:'pointer'}} onClick={()=>showToast('노트 상세보기 (데모)','info')}>
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              {n.tags.map(t=><span key={t} className="chip" style={{background:'var(--accent-soft)',color:'var(--accent-text)',fontSize:11}}>{t}</span>)}
            </div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{n.title}</div>
            <div style={{fontSize:12,color:'var(--text-3)',marginBottom:8}}>{n.menu} · {n.date}</div>
            <div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.6}}>{n.summary}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
