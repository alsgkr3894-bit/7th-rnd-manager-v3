'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';

export default function Page() {
  const title = "식자재 이슈";
  const bc = ["식자재","식자재 이슈"];

  const issues=[
    {name:'모짜렐라치즈',type:'price-up',detail:'7,400원 → 7,680원 (+3.8%)',impact:'영향 메뉴 23개',when:'방금 전'},
    {name:'고르곤졸라',type:'price-up',detail:'40,000원 → 42,000원 (+5.0%)',impact:'영향 메뉴 4개',when:'2시간 전'},
    {name:'새우(냉동)',type:'price-up',detail:'17,800원 → 18,500원 (+3.9%)',impact:'영향 메뉴 6개',when:'어제'},
    {name:'비엔나소시지',type:'unlinked',detail:'제때 연동 안 됨',impact:'수동 단가 사용 중',when:'3일 전'},
    {name:'마요네즈',type:'unlinked',detail:'제때 연동 안 됨',impact:'수동 단가 사용 중',when:'5일 전'},
  ];
  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title} sub="단가 인상 · 미연동 품목 · 단위 오류" actions={<button className="btn" onClick={()=>showToast('CSV 파일이 저장됐어요','ok')}><Icon.download style={{width:14,height:14}}/>CSV 내보내기</button>}/>
      <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:24}}>
        {issues.map((it,i)=>(
          <div key={i} className="card issue-card" style={{display:'flex',alignItems:'center',gap:16,padding:'16px 20px'}}>
            <div style={{width:40,height:40,borderRadius:12,background:it.type==='price-up'?'var(--negative-soft)':'var(--warn-soft)',color:it.type==='price-up'?'var(--negative)':'var(--warn)',display:'grid',placeItems:'center',flexShrink:0}}>
              <Icon.alert style={{width:20,height:20}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700}}>{it.name}</div>
              <div style={{fontSize:13,color:'var(--text-2)',marginTop:2}}>{it.detail} · {it.impact}</div>
            </div>
            <div style={{fontSize:12,color:'var(--text-3)'}}>{it.when}</div>
            <button className="btn sm" onClick={()=>showToast(it.name+' 이슈 확인 완료','ok')}>확인</button>
          </div>
        ))}
      </div>
    </main>
  );
}
