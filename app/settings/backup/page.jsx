'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  const title = "데이터 백업";
  const bc = ["설정 / 백업","데이터 백업"];
  const router = useRouter();

  const backups=[
    {id:'BKP-20260522-001',date:'2026.05.22 14:32',size:'184 MB',status:'성공'},
    {id:'BKP-20260521-001',date:'2026.05.21 09:00',size:'182 MB',status:'성공'},
    {id:'BKP-20260519-001',date:'2026.05.19 09:00',size:'179 MB',status:'실패'},
    {id:'BKP-20260518-001',date:'2026.05.18 09:00',size:'178 MB',status:'성공'},
  ];
  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title} sub="수동·자동 백업 관리"
        actions={<button className="btn primary" onClick={()=>showToast('백업 완료 — S3에 저장됐어요 (184 MB)','ok')}><Icon.upload style={{width:14,height:14}}/>지금 백업 실행</button>}
      />
      <div className="card table-card" style={{marginTop:24}}>
        <table className="data-table stagger-rows">
          <thead><tr><th>백업 ID</th><th>일시</th><th style={{width:100}}>크기</th><th style={{width:80}}>상태</th><th style={{width:160}}></th></tr></thead>
          <tbody>{backups.map(b=>(
            <tr key={b.id}>
              <td className="num" style={{fontWeight:600}}>{b.id}</td>
              <td style={{color:'var(--text-2)'}}>{b.date}</td>
              <td className="num">{b.size}</td>
              <td><span className="chip" style={{background:b.status==='성공'?'var(--positive-soft)':'var(--negative-soft)',color:b.status==='성공'?'var(--positive)':'var(--negative)'}}>{b.status}</span></td>
              <td><div style={{display:'flex',gap:8}}>
                <button className="btn sm" disabled={b.status!=='성공'} onClick={()=>b.status==='성공'&&showToast(b.id+' 다운로드 완료','ok')}><Icon.download style={{width:12,height:12}}/>다운로드</button>
                <button className="btn sm" disabled={b.status!=='성공'} onClick={()=>b.status==='성공'&&showToast(b.id+' 복원 요청됨','info')}>복원</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </main>
  );
}
