'use client';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { SearchBox } from '@/components/ui/SearchBox';
import { SALES_ALIASES } from '@/lib/sales';
import { getActiveBrandId } from '@/lib/active-brand';
import { UserAliasesSection } from './UserAliasesSection';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

/**
 * SettingsAliasCard — 메뉴별 별칭 관리 (정책 표시)
 *
 * SALES_ALIASES: '{입력 메뉴명} → {표준 메뉴명}' 매핑
 * 분류 매칭 전에 정규화된 메뉴명을 표준 메뉴명으로 치환.
 */
export function SettingsAliasCard() {
  const [query, setQuery] = useState('');
  // 기본 별칭은 7번가(main) 전용. 다른 브랜드는 빈 목록(DB 사용자 별칭만).
  const [aliases, setAliases] = useState(SALES_ALIASES);
  useEffect(() => { setAliases(getActiveBrandId() === 'main' ? SALES_ALIASES : []); }, []);
  const safeAliases = useMemo(() => asObjectArray(aliases), [aliases]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return safeAliases;
    return safeAliases.filter(a =>
      asDisplayText(a.inputName).toLowerCase().includes(q) ||
      asDisplayText(a.outputName).toLowerCase().includes(q) ||
      asDisplayText(a.description).toLowerCase().includes(q)
    );
  }, [query, safeAliases]);

  return (
    <div className="card" style={{marginTop:16}}>
      <UserAliasesSection />
      <div style={{height:1, background:'var(--border)', margin:'16px 0'}}/>
      <div className="card-header">
        <div>
          <div className="card-title">메뉴별 별칭 관리</div>
          <div className="card-sub">엑셀에서 자주 쓰는 줄임말·동의어 → 표준 메뉴명 매핑 · 총 {safeAliases.length}개</div>
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
              {filtered.map((a, index) => {
                const key = asDisplayText(a.aliasId, `alias-${index}`);
                const aliasId = asDisplayText(a.aliasId, '-');
                const inputName = asDisplayText(a.inputName, '-');
                const outputName = asDisplayText(a.outputName, '-');
                const description = asDisplayText(a.description);

                return (
                <tr key={key}>
                  <td className="num" style={{color:'var(--text-3)', fontSize:12}}>{aliasId}</td>
                  <td className="cell-name"><div className="menu-name">{inputName}</div></td>
                  <td>
                    <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                      <Icon.chevRight style={{width:12, height:12, color:'var(--text-4)'}}/>
                      <b>{outputName}</b>
                    </span>
                  </td>
                  <td style={{color:'var(--text-3)', fontSize:13}}>{description}</td>
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
