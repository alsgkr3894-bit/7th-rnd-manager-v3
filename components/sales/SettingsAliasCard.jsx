'use client';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { SALES_ALIASES } from '@/lib/sales';

/**
 * SettingsAliasCard — 메뉴별 별칭 관리 (정책 표시)
 *
 * SALES_ALIASES: '{입력 메뉴명} → {표준 메뉴명}' 매핑
 * 분류 매칭 전에 정규화된 메뉴명을 표준 메뉴명으로 치환.
 */
export function SettingsAliasCard() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SALES_ALIASES;
    return SALES_ALIASES.filter(a =>
      a.inputName.toLowerCase().includes(q) ||
      a.outputName.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="card" style={{marginTop:16}}>
      <div className="card-header">
        <div>
          <div className="card-title">메뉴별 별칭 관리</div>
          <div className="card-sub">엑셀에서 자주 쓰는 줄임말·동의어 → 표준 메뉴명 매핑 · 총 {SALES_ALIASES.length}개</div>
        </div>
      </div>

      <SearchBox value={query} onChange={setQuery} placeholder="별칭·표준명·설명 검색" />

      {filtered.length === 0 ? (
        <EmptyMsg>검색 조건에 맞는 별칭이 없습니다</EmptyMsg>
      ) : (
        <div style={{overflowX:'auto'}}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{width:160}}>ID</th>
                <th>입력 (별칭)</th>
                <th>출력 (표준)</th>
                <th>설명</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.aliasId}>
                  <td className="num" style={{color:'var(--text-3)', fontSize:12}}>{a.aliasId}</td>
                  <td className="cell-name"><div className="menu-name">{a.inputName}</div></td>
                  <td>
                    <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                      <Icon.chevRight style={{width:12, height:12, color:'var(--text-4)'}}/>
                      <b>{a.outputName}</b>
                    </span>
                  </td>
                  <td style={{color:'var(--text-3)', fontSize:13}}>{a.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div style={{position:'relative', marginBottom:12}}>
      <Icon.search style={{
        width:14, height:14, position:'absolute', top:'50%', left:12,
        transform:'translateY(-50%)', color:'var(--text-4)',
      }}/>
      <input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width:'100%', padding:'8px 12px 8px 32px', borderRadius:8,
          border:'1px solid var(--border)', background:'var(--surface-2)',
          color:'var(--text-1)', fontSize:13,
        }}
      />
    </div>
  );
}

function EmptyMsg({ children }) {
  return (
    <div style={{padding:'32px 0', textAlign:'center', color:'var(--text-3)', fontSize:13}}>
      {children}
    </div>
  );
}
