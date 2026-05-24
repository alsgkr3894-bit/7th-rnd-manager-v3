'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader, FilterBar } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { INGREDIENTS } from '@/lib/data';

export default function Page() {
  const title = "식자재 리스트";
  const bc = ["식자재","식자재 리스트"];

  const [search, setSearch] = useState('');
  const filtered = INGREDIENTS.filter(i=>!search||i.name.includes(search));
  return (
    <main className="main">
      <PageHeader breadcrumb={bc} title={title} sub="제때 연동 단가 기준 · 마지막 업데이트 2026.05.21"
        actions={<><button className="btn" onClick={()=>showToast('양식 다운로드 완료','ok')}><Icon.download style={{width:14,height:14}}/>양식 다운로드</button><button className="btn primary" onClick={()=>showToast('단가 파일을 업로드해주세요 (데모)','info')}><Icon.upload style={{width:14,height:14}}/>단가 업로드</button></>}
      />
      <FilterBar search={search} onSearch={setSearch}/>
      <div className="card table-card" style={{marginTop:16}}>
        <table className="data-table stagger-rows">
          <thead><tr><th>재료명</th><th style={{width:80}}>단위</th><th style={{width:140,textAlign:'right'}}>단가</th><th style={{width:140,textAlign:'right'}}>전 단가</th><th style={{width:120}}>카테고리</th><th>공급사</th></tr></thead>
          <tbody>{filtered.map(i=>{
            const up=i.price>i.prevPrice,dn=i.price<i.prevPrice;
            return(<tr key={i.name}>
              <td style={{fontWeight:600}}>{i.name}</td>
              <td>{i.unit}</td>
              <td className="num right" style={{color:up?'var(--negative)':dn?'var(--positive)':undefined,fontWeight:up||dn?700:400}}>{i.price.toLocaleString()}원</td>
              <td className="num right" style={{color:'var(--text-3)'}}>{i.prevPrice.toLocaleString()}원</td>
              <td><span className="chip">{i.category}</span></td>
              <td style={{color:'var(--text-2)'}}>{i.supplier}</td>
            </tr>);
          })}</tbody>
        </table>
      </div>
    </main>
  );
}
