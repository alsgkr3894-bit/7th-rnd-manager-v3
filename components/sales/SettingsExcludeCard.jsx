'use client';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { SALES_RULES } from '@/lib/sales';

/**
 * SettingsExcludeCard — 품목 제외 목록 (정책 표시)
 *
 * SALES_RULES 중 category === '품목제외' 인 규칙들.
 * 이 메뉴들은 집계/순위/매출 계산에서 자동 제외됩니다.
 */
export function SettingsExcludeCard() {
  const [query, setQuery] = useState('');

  const excluded = useMemo(() => {
    return SALES_RULES.filter(r => r.category === '품목제외');
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return excluded;
    return excluded.filter(r => {
      const pat = String(r.pattern || '').toLowerCase();
      const name = String(r.name || '').toLowerCase();
      return pat.includes(q) || name.includes(q);
    });
  }, [excluded, query]);

  return (
    <div className="card" style={{marginTop:16}}>
      <div className="card-header">
        <div>
          <div className="card-title">품목 제외 목록</div>
          <div className="card-sub">집계·순위·매출 계산에서 자동 제외 · 총 {excluded.length}개</div>
        </div>
      </div>

      <SearchBox value={query} onChange={setQuery} placeholder="패턴·이름 검색" />

      {filtered.length === 0 ? (
        <EmptyMsg>검색 조건에 맞는 항목이 없습니다</EmptyMsg>
      ) : (
        <div style={{overflowX:'auto'}}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{width:160}}>규칙 ID</th>
                <th>패턴 (정규화 후)</th>
                <th>이름</th>
                <th style={{width:90}}>매칭 방식</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.ruleId}>
                  <td className="num" style={{color:'var(--text-3)', fontSize:12}}>{r.ruleId}</td>
                  <td className="cell-name"><div className="menu-name">{String(r.pattern)}</div></td>
                  <td style={{color:'var(--text-2)', fontSize:13}}>{r.name}</td>
                  <td>
                    <span className="chip" style={{
                      background: r.matchType === 'exact' ? 'var(--surface-2)' : 'var(--accent-soft)',
                      color: r.matchType === 'exact' ? 'var(--text-2)' : 'var(--accent-text)',
                    }}>
                      {r.matchType === 'exact' ? '정확' : '정규식'}
                    </span>
                  </td>
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
