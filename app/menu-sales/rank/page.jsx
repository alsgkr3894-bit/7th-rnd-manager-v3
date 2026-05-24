'use client';
import { useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { MENUS_BY_PERIOD } from '@/lib/data';

export default function Page() {
  const title = "메뉴판매량 순위";
  const bc = ["메뉴 판매량","판매량 순위"];

  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('qty');
  const [sortDir, setSortDir] = useState('desc');
  const menus = MENUS_BY_PERIOD['2026.05'];
  const allTotal = menus.reduce((s,m)=>s+Object.values(m.variants).reduce((a,v)=>a+v,0),0);
  const counted = menus.map(m=>{const qty=Object.values(m.variants).reduce((a,v)=>a+v,0);return{...m,qty,share:(qty/allTotal)*100};});
  const filtered = useMemo(()=>{
    let r=counted;
    if(cat!=='all')r=r.filter(x=>x.cat===cat);
    if(search.trim())r=r.filter(x=>x.name.includes(search.trim()));
    const scope=r.reduce((s,m)=>s+m.qty,0)||1;
    r=r.map(m=>({...m,share:(m.qty/scope)*100}));
    return [...r].sort((a,b)=>sortDir==='asc'?a[sortKey]-b[sortKey]:b[sortKey]-a[sortKey]);
  },[cat,search,sortKey,sortDir,counted]);
  const cats=['all','피자','1인피자','사이드','엣지&도우','추가토핑','음료'];
  const SortIco=({k})=><span className={'sort-ico-wrap '+(sortKey===k?sortDir:'')} style={{marginLeft:4,display:'inline-flex',flexDirection:'column',gap:1,opacity:sortKey===k?1:0.3}}>
    {sortKey===k&&sortDir==='asc'?<span className="asc-tri"/>:<span className="neutral-tri-up"/>}
    {sortKey===k&&sortDir==='desc'?<span className="desc-tri"/>:<span className="neutral-tri-down"/>}
  </span>;
  const toggleSort=(k)=>{ if(sortKey===k)setSortDir(d=>d==='asc'?'desc':'asc'); else{setSortKey(k);setSortDir('desc');} };
  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title} sub="2026년 5월 기준 · 최신 제때 단가 2026.05.21 반영"
        actions={<><button className="btn" onClick={()=>showToast('양식 다운로드 완료','ok')}><Icon.download style={{width:14,height:14}}/>양식 다운로드</button><button className="btn" onClick={()=>showToast('CSV 파일이 저장됐어요','ok')}><Icon.download style={{width:14,height:14}}/>CSV 내보내기</button></>}
      />
      <FilterBar search={search} onSearch={setSearch}
        chips={cats.map(c=>({label:c==='all'?'전체':c,active:cat===c,onClick:()=>setCat(c)}))}
      />
      <div className="card table-card" style={{marginTop:16}}>
        <table className="data-table stagger-rows">
          <thead><tr>
            <th style={{width:60}}>순위</th>
            <th>메뉴명</th>
            <th style={{width:120}}>카테고리</th>
            <th style={{width:130,textAlign:'right'}} onClick={()=>toggleSort('qty')} className="sort-th">판매량<SortIco k="qty"/></th>
            <th style={{width:120,textAlign:'right'}} onClick={()=>toggleSort('share')} className="sort-th">비중<SortIco k="share"/></th>
            <th style={{width:110,textAlign:'right'}} onClick={()=>toggleSort('costRate')} className="sort-th">원가율<SortIco k="costRate"/></th>
          </tr></thead>
          <tbody>
            {filtered.map((m,i)=>(
              <tr key={m.name}>
                <td className="num" style={{fontWeight:700}}>{i+1}</td>
                <td style={{fontWeight:600}}>{m.name}</td>
                <td><span className="chip">{m.cat}</span></td>
                <td className="num right">{m.qty.toLocaleString()}</td>
                <td className="num right">{m.share.toFixed(1)}%</td>
                <td className="num right"><span style={{color:m.costRate>=35?'var(--negative)':m.costRate>=30?'var(--warn)':'inherit',fontWeight:m.costRate>=35?700:400}}>{m.costRate}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
