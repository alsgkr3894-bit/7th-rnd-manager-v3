'use client';
import { useEffect, useMemo, useState } from 'react';
import { SearchBox } from '@/components/ui/SearchBox';
import { SALES_RULES } from '@/lib/sales';
import { getActiveBrandId } from '@/lib/active-brand';
import { UserExcludedSection } from './UserExcludedSection';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * SettingsExcludeCard — 품목 제외 목록 (정책 표시)
 *
 * SALES_RULES 중 category === '품목제외' 인 규칙들.
 * 이 메뉴들은 집계/순위/매출 계산에서 자동 제외됩니다.
 */
export function SettingsExcludeCard() {
  const [query, setQuery] = useState('');
  // 기본 제외 목록은 7번가(main) 전용. 다른 브랜드는 빈 목록(DB 사용자 제외만).
  const [rules, setRules] = useState(SALES_RULES);
  useEffect(() => { setRules(getActiveBrandId() === 'main' ? SALES_RULES : []); }, []);
  const safeRules = useMemo(() => asObjectArray(rules), [rules]);

  const excluded = useMemo(() => {
    return safeRules.filter(r => asDisplayText(r.category) === '품목제외');
  }, [safeRules]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return excluded;
    return excluded.filter(r => {
      const pat = asDisplayText(r.pattern).toLowerCase();
      const name = asDisplayText(r.name).toLowerCase();
      return pat.includes(q) || name.includes(q);
    });
  }, [excluded, query]);

  return (
    <div className="card" style={{marginTop:16}}>
      <UserExcludedSection />
      <div style={{height:1, background:'var(--border)', margin:'16px 0'}}/>
      <div className="card-header">
        <div>
          <div className="card-title">기본 제외 목록 (정책)</div>
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
              {filtered.map((r, index) => {
                const key = asDisplayText(r.ruleId, `excluded-rule-${index}`);
                const ruleId = asDisplayText(r.ruleId, '-');
                const pattern = asDisplayText(r.pattern, '-');
                const name = asDisplayText(r.name, '-');
                const matchType = asDisplayText(r.matchType);
                const isExact = matchType === 'exact';

                return (
                <tr key={key}>
                  <td className="num" style={{color:'var(--text-3)', fontSize:12}}>{ruleId}</td>
                  <td className="cell-name"><div className="menu-name">{pattern}</div></td>
                  <td style={{color:'var(--text-2)', fontSize:13}}>{name}</td>
                  <td>
                    <span className="chip" style={{
                      background: isExact ? 'var(--surface-2)' : 'var(--accent-soft)',
                      color: isExact ? 'var(--text-2)' : 'var(--accent-text)',
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
