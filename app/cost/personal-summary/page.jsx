'use client';
import { useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { MENUS_BY_PERIOD } from '@/lib/data';

export default function Page() {
  const title = "1인피자 종합";
  const bc = ["원가계산","1인피자 종합"];

  const [sortKey,setSortKey]=useState('rate');
  const [sortDir,setSortDir]=useState('desc');
  const menus=MENUS_BY_PERIOD['2026.05'].filter(m=>m.cat==='피자'||m.cat==='1인피자');
  const sorted=useMemo(()=>[...menus].sort((a,b)=>sortDir==='asc'?a[sortKey]-b[sortKey]:b[sortKey]-a[sortKey]),[menus,sortKey,sortDir]);
  const toggleSort=(k)=>{ if(sortKey===k)setSortDir(d=>d==='asc'?'desc':'asc'); else{setSortKey(k);setSortDir('desc');} };
  const SortIco=({k})=><span className={'sort-ico-wrap '+(sortKey===k?sortDir:'')} style={{marginLeft:4}}>
    {sortKey===k&&sortDir==='asc'?<span className="asc-tri"/>:<><span className="neutral-tri-up"/><span className="neutral-tri-down"/></>}
  </span>;
  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title}
        sub="최신 제때 단가 2026.05.21 반영 · 35% 초과 = 위험"
        actions={<><button className="btn" onClick={()=>showToast('양식 다운로드 완료','ok')}><Icon.download style={{width:14,height:14}}/>양식 다운로드</button><button className="btn" onClick={()=>showToast('CSV 파일이 저장됐어요','ok')}><Icon.download style={{width:14,height:14}}/>CSV 내보내기</button></>}
      />
      <div className="card table-card" style={{marginTop:24}}>
        <table className="data-table stagger-rows">
          <thead><tr>
            <th>메뉴명</th><th style={{width:120}}>카테고리</th>
            <th style={{width:160,textAlign:'right'}} onClick={()=>toggleSort('costRate')} className="sort-th">원가율<SortIco k="costRate"/></th>
          </tr></thead>
          <tbody>
            {sorted.map(m=>{
              const risk=m.costRate>=35;
              return (
                <tr key={m.name} style={{background:risk?'var(--negative-soft)':undefined}}>
                  <td style={{fontWeight:600}}>{m.name}{risk&&<span style={{marginLeft:8,fontSize:11,color:'var(--negative)',fontWeight:700}}>⚠ 위험</span>}</td>
                  <td><span className="chip">{m.cat}</span></td>
                  <td className="num right">
                    <span style={{color:risk?'var(--negative)':m.costRate>=30?'var(--warn)':'inherit',fontWeight:risk?700:400}}>{m.costRate}%</span>
                    <div className="cost-gauge-wrap" style={{marginTop:4}}>
                      <div className="cost-gauge-track"><div className="cost-gauge-fill" style={{width:Math.min(m.costRate/50*100,100)+'%',background:risk?'var(--negative)':m.costRate>=30?'var(--warn)':'var(--positive)'}}/></div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
