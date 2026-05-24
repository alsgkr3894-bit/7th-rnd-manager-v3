'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  const title = "노트 작성";
  const bc = ["메뉴개발노트","노트 작성"];
  const router = useRouter();

  const [form,setForm]=useState({menu:'',type:'신메뉴',temp:'',time:'',eval:'',note:''});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title} sub="테스트 조건과 평가를 기록하세요"
        actions={<><button className="btn" onClick={()=>router.push('/note')}>취소</button><button className="btn primary" onClick={()=>{showToast('노트가 저장됐어요','ok');router.push('/note');}}>저장하기</button></>}
      />
      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:24,marginTop:24,alignItems:'start'}}>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card">
            <div className="card-title" style={{marginBottom:16}}>기본 정보</div>
            {[['메뉴명','menu','텍스트'],['테스트 유형','type','select'],['오븐 온도 (°C)','temp','숫자'],['굽는 시간','time','텍스트']].map(([label,key,hint])=>(
              <div key={key} style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--text-3)',marginBottom:6}}>{label}</label>
                {key==='type'
                  ? <select style={{width:'100%',padding:'10px 12px',border:'1px solid var(--border)',borderRadius:10,fontFamily:'inherit',fontSize:14,background:'var(--surface)'}} value={form[key]} onChange={e=>set(key,e.target.value)}>
                      {['신메뉴','기존메뉴변경','엣지/도우','사이드','한정메뉴'].map(o=><option key={o}>{o}</option>)}
                    </select>
                  : <input style={{width:'100%',padding:'10px 12px',border:'1px solid var(--border)',borderRadius:10,fontFamily:'inherit',fontSize:14,boxSizing:'border-box'}} placeholder={hint} value={form[key]} onChange={e=>set(key,e.target.value)}/>
                }
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title" style={{marginBottom:12}}>테스트 평가</div>
            <textarea style={{width:'100%',minHeight:120,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:10,fontFamily:'inherit',fontSize:14,resize:'vertical',boxSizing:'border-box'}} placeholder="맛, 식감, 외관 등 평가 내용을 기록하세요." value={form.eval} onChange={e=>set('eval',e.target.value)}/>
          </div>
          <div className="card">
            <div className="card-title" style={{marginBottom:12}}>특이사항 / 메모</div>
            <textarea style={{width:'100%',minHeight:80,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:10,fontFamily:'inherit',fontSize:14,resize:'vertical',boxSizing:'border-box'}} placeholder="재료 변경, 다음 테스트 방향 등을 기록하세요." value={form.note} onChange={e=>set('note',e.target.value)}/>
          </div>
        </div>
        <div className="card" style={{position:'sticky',top:80}}>
          <div className="card-title" style={{marginBottom:12}}>요약 카드</div>
          <div style={{fontSize:13,color:'var(--text-3)',marginBottom:8}}>저장 후 보고용 요약으로 활용돼요.</div>
          <div style={{background:'var(--surface-2)',borderRadius:12,padding:16,lineHeight:1.8,fontSize:13}}>
            <div><b>메뉴</b>: {form.menu||'—'}</div>
            <div><b>유형</b>: {form.type}</div>
            <div><b>온도/시간</b>: {form.temp||'—'}°C / {form.time||'—'}</div>
            <div style={{marginTop:8,color:'var(--text-2)'}}>{form.eval||'평가 내용을 입력하면 여기에 표시돼요.'}</div>
          </div>
          <button className="btn" style={{width:'100%',marginTop:12}} onClick={()=>showToast('보고용 요약이 클립보드에 복사됐어요','ok')}>보고용 복사</button>
        </div>
      </div>
    </main>
  );
}
