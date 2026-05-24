'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  const title = "시스템 설정";
  const bc = ["설정 / 백업","시스템 설정"];
  const router = useRouter();

  const [dark,setDark]=useState(false);
  const [density,setDensity]=useState('normal');
  const [notif,setNotif]=useState(true);
  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title} sub="다크모드, 알림, 밀도 등 시스템 설정"/>
      <div style={{display:'flex',flexDirection:'column',gap:16,marginTop:24,maxWidth:600}}>
        {[
          {label:'다크모드',desc:'어두운 배경으로 전환해요',val:dark,set:setDark},
          {label:'알림',desc:'단가 변동, 업로드 완료 알림',val:notif,set:setNotif},
        ].map(({label,desc,val,set})=>(
          <div key={label} className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 24px'}}>
            <div>
              <div style={{fontWeight:700}}>{label}</div>
              <div style={{fontSize:13,color:'var(--text-3)',marginTop:2}}>{desc}</div>
            </div>
            <button onClick={()=>{set(v=>!v);showToast(label+' '+(val?'해제':'설정')+'됐어요','ok');}}
              style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',background:val?'var(--accent)':'var(--border-strong)',transition:'background 200ms',position:'relative'}}>
              <span style={{position:'absolute',top:3,left:val?22:3,width:18,height:18,borderRadius:'50%',background:'white',transition:'left 200ms'}}></span>
            </button>
          </div>
        ))}
        <div className="card" style={{padding:'18px 24px'}}>
          <div style={{fontWeight:700,marginBottom:12}}>화면 밀도</div>
          <div style={{display:'flex',gap:8}}>
            {['comfortable','normal','compact'].map(d=>(
              <button key={d} className={'chip '+(density===d?'active':'')} onClick={()=>{setDensity(d);showToast(d+' 밀도 적용됐어요','ok');}}>
                {{comfortable:'편안하게',normal:'기본',compact:'촘촘하게'}[d]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
