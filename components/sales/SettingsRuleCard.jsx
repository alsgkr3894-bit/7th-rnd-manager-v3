'use client';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { SALES_RULES } from '@/lib/sales';
import { UserRulesSection } from './UserRulesSection';

const CATEGORY_ORDER = ['전체', '피자', '1인피자', '사이드', '사이드(소스)', '엣지&도우', '세트메뉴', '하프앤하프', '추가토핑', '음료', '품목제외'];

/**
 * SettingsRuleCard — 카테고리 분류 규칙 (정책 표시)
 *
 * BASIC + MS9 + EXTRA 룰 모두 표시.
 * 정규화된 메뉴명을 (category, groupName, detailName)으로 매핑.
 */
export function SettingsRuleCard() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('전체');

  const categories = useMemo(() => {
    const found = new Set(SALES_RULES.map(r => r.category).filter(Boolean));
    const ordered = CATEGORY_ORDER.filter(c => c === '전체' || found.has(c));
    const extras = Array.from(found).filter(c => !CATEGORY_ORDER.includes(c));
    return [...ordered, ...extras];
  }, []);

  const filtered = useMemo(() => {
    let list = SALES_RULES;
    if (filter !== '전체') list = list.filter(r => r.category === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(r => {
        const pat = String(r.pattern || '').toLowerCase();
        const name = String(r.name || '').toLowerCase();
        const group = String(r.groupName || '').toLowerCase();
        return pat.includes(q) || name.includes(q) || group.includes(q);
      });
    }
    return list;
  }, [filter, query]);

  return (
    <div className="card" style={{marginTop:16}}>
      <UserRulesSection />
      <div style={{height:1, background:'var(--border)', margin:'16px 0'}}/>
      <div className="card-header">
        <div>
          <div className="card-title">기본 분류 규칙</div>
          <div className="card-sub">메뉴명 정규화 → 카테고리·중분류·상세 매핑 · 총 {SALES_RULES.length}개</div>
        </div>
      </div>

      {/* 카테고리 chip */}
      <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:12}}>
        {categories.map(c => {
          const cnt = c === '전체' ? SALES_RULES.length : SALES_RULES.filter(r => r.category === c).length;
          return (
            <button key={c} onClick={() => setFilter(c)} className="chip"
              style={{
                cursor:'pointer', border:'none',
                background: filter === c ? 'var(--accent)' : 'var(--surface-2)',
                color: filter === c ? '#fff' : 'var(--text-2)',
                fontWeight: 600,
                display:'inline-flex', alignItems:'center', gap:6,
              }}
            >
              {c}
              <span style={{
                background: filter === c ? 'rgba(255,255,255,0.2)' : 'var(--surface)',
                color: filter === c ? '#fff' : 'var(--text-3)',
                padding:'1px 6px', borderRadius:10, fontSize:11, fontWeight:700,
              }}>{cnt}</span>
            </button>
          );
        })}
      </div>

      <SearchBox value={query} onChange={setQuery} placeholder="패턴·이름·중분류 검색" />

      {filtered.length === 0 ? (
        <EmptyMsg>검색 조건에 맞는 규칙이 없습니다</EmptyMsg>
      ) : (
        <div style={{overflowX:'auto', maxHeight:600, overflowY:'auto'}}>
          <table className="data-table">
            <thead style={{position:'sticky', top:0, background:'var(--surface)', zIndex:1}}>
              <tr>
                <th>패턴 (정규화 후)</th>
                <th style={{width:120}}>카테고리</th>
                <th style={{width:140}}>중분류</th>
                <th style={{width:140}}>상세</th>
                <th style={{width:80}}>방식</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.ruleId}>
                  <td className="cell-name"><div className="menu-name">{String(r.pattern)}</div></td>
                  <td>
                    <span className="chip" style={{background:'var(--surface-2)', color:'var(--text-2)'}}>
                      {r.category || '-'}
                    </span>
                  </td>
                  <td style={{color:'var(--text-2)', fontSize:13}}>{r.groupName || '-'}</td>
                  <td style={{color:'var(--text-3)', fontSize:12}}>{r.detailName || '-'}</td>
                  <td>
                    <span className="chip" style={{
                      background: r.matchType === 'exact' ? 'var(--surface-2)' : 'var(--accent-soft)',
                      color: r.matchType === 'exact' ? 'var(--text-2)' : 'var(--accent-text)',
                      fontSize:11,
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
