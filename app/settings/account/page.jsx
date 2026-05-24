'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  const title = "계정 관리";
  const bc = ["설정 / 백업","계정 관리"];
  const router = useRouter();

  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title} sub="계정 정보 및 팀 멤버 관리"/>
      <div style={{display:'flex',flexDirection:'column',gap:16,marginTop:24,maxWidth:600}}>
        <div className="card" style={{padding:'24px'}}>
          <div className="card-title" style={{marginBottom:16}}>내 계정</div>
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
            <div style={{width:56,height:56,borderRadius:'50%',background:'var(--accent)',color:'white',display:'grid',placeItems:'center',fontSize:20,fontWeight:800}}>민</div>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>민혁 책임</div>
              <div style={{fontSize:13,color:'var(--text-3)'}}>R&D팀 · minhuek@7thstreet.co.kr</div>
            </div>
          </div>
          <button className="btn" style={{marginRight:8}} onClick={()=>showToast('프로필 저장됐어요','ok')}>프로필 수정</button>
          <button className="btn" onClick={()=>showToast('비밀번호 변경 이메일이 발송됐어요','info')}>비밀번호 변경</button>
        </div>
        <div className="card" style={{padding:'24px'}}>
          <div className="card-title" style={{marginBottom:16}}>팀 멤버</div>
          {[{name:'민혁 책임',role:'R&D팀',email:'minhuek@7thstreet.co.kr'},{name:'지수 선임',role:'R&D팀',email:'jisu@7thstreet.co.kr'},{name:'태호 책임',role:'품질팀',email:'taeho@7thstreet.co.kr'}].map((m,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<2?'1px solid var(--divider)':undefined}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'var(--accent-soft)',color:'var(--accent-text)',display:'grid',placeItems:'center',fontWeight:700}}>{m.name[0]}</div>
              <div style={{flex:1}}><div style={{fontWeight:600}}>{m.name}</div><div style={{fontSize:12,color:'var(--text-3)'}}>{m.role} · {m.email}</div></div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
