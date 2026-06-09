'use client';
import { useEffect, useMemo, useState } from 'react';
import { SearchBox } from '@/components/ui/SearchBox';
import { SALES_RULES, CATEGORY_INPUT_OPTIONS } from '@/lib/sales';
import { getActiveBrandId } from '@/lib/active-brand';
import { UserRulesSection } from './UserRulesSection';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const FILTER_CATEGORIES = ['전체', ...CATEGORY_INPUT_OPTIONS];

/**
 * SettingsRuleCard — 카테고리 분류 규칙 (정책 표시)
 *
 * BASIC + MS9 + EXTRA 룰 모두 표시.
 * 정규화된 메뉴명을 (category, groupName, detailName)으로 매핑.
 */
export function SettingsRuleCard() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('전체');
  // 기본 분류 규칙은 7번가(main) 전용. 다른 브랜드는 빈 목록(DB 사용자 규칙만 사용).
  // SSR/첫 렌더는 서버와 동일하게 SALES_RULES로 두고 마운트 후 교정(하이드레이션 일치).
  const [rules, setRules] = useState(SALES_RULES);
  useEffect(() => { setRules(getActiveBrandId() === 'main' ? SALES_RULES : []); }, []);
  const safeRules = useMemo(() => asObjectArray(rules), [rules]);

  const categories = useMemo(() => {
    const found = new Set(safeRules.map(r => asDisplayText(r.category)).filter(Boolean));
    const ordered = FILTER_CATEGORIES.filter(c => c === '전체' || found.has(c));
    const extras = Array.from(found).filter(c => !FILTER_CATEGORIES.includes(c));
    return [...ordered, ...extras];
  }, [safeRules]);

  const filtered = useMemo(() => {
    let list = safeRules;
    if (filter !== '전체') list = list.filter(r => asDisplayText(r.category) === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(r => {
        const pat = asDisplayText(r.pattern).toLowerCase();
        const name = asDisplayText(r.name).toLowerCase();
        const group = asDisplayText(r.groupName).toLowerCase();
        return pat.includes(q) || name.includes(q) || group.includes(q);
      });
    }
    return list;
  }, [filter, query, safeRules]);

  return (
    <div className="card" style={{marginTop:16}}>
      <UserRulesSection />
      <div style={{height:1, background:'var(--border)', margin:'16px 0'}}/>
      <div className="card-header">
        <div>
          <div className="card-title">기본 분류 규칙</div>
          <div className="card-sub">메뉴명 정규화 → 카테고리·중분류·상세 매핑 · 총 {safeRules.length}개</div>
        </div>
      </div>

      {/* 카테고리 chip */}
      <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:12}}>
        {categories.map(c => {
          const cnt = c === '전체' ? safeRules.length : safeRules.filter(r => asDisplayText(r.category) === c).length;
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
              {filtered.map((r, index) => {
                const key = asDisplayText(r.ruleId, `rule-${index}`);
                const pattern = asDisplayText(r.pattern, '-');
                const category = asDisplayText(r.category, '-');
                const groupName = asDisplayText(r.groupName, '-');
                const detailName = asDisplayText(r.detailName, '-');
                const matchType = asDisplayText(r.matchType);
                const isExact = matchType === 'exact';

                return (
                <tr key={key}>
                  <td className="cell-name"><div className="menu-name">{pattern}</div></td>
                  <td>
                    <span className="chip" style={{background:'var(--surface-2)', color:'var(--text-2)'}}>
                      {category}
                    </span>
                  </td>
                  <td style={{color:'var(--text-2)', fontSize:13}}>{groupName}</td>
                  <td style={{color:'var(--text-3)', fontSize:12}}>{detailName}</td>
                  <td>
                    <span className="chip" style={{
                      background: isExact ? 'var(--surface-2)' : 'var(--accent-soft)',
                      color: isExact ? 'var(--text-2)' : 'var(--accent-text)',
                      fontSize:11,
                    }}>
                      {isExact ? '정확' : '정규식'}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
