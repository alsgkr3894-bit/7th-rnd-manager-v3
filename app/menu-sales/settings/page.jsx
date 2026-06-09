'use client';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SALES_ALIASES, SALES_RULES, getUserExcluded, getUserRules } from '@/lib/sales';
import { SettingsAliasCard } from '@/components/sales/SettingsAliasCard';
import { SettingsExcludeCard } from '@/components/sales/SettingsExcludeCard';
import { SettingsRuleCard } from '@/components/sales/SettingsRuleCard';
import { formatNumber } from '@/lib/format';
import { initDB } from '@/lib/db';
import { getActiveBrandId } from '@/lib/active-brand';

const TABS = [
  { key: 'rule',    label: '카테고리 분류 규칙' },
  { key: 'alias',   label: '별칭 관리' },
  { key: 'exclude', label: '품목 제외' },
];

export default function Page() {
  const [tab, setTab] = useState('rule');
  const [excludeCount, setExcludeCount] = useState(0);
  const [excludeLoadFailed, setExcludeLoadFailed] = useState(false);

  // 기본 규칙·별칭 수는 7번가(main) 전용. 다른 브랜드는 0.
  // 초기값 0: SSR/클라이언트 모두 동일 → hydration 불일치 없음. 마운트 후 main이면 실제 수로 교정.
  const [ruleCount, setRuleCount]   = useState(0);
  const [aliasCount, setAliasCount] = useState(0);
  useEffect(() => {
    if (getActiveBrandId() === 'main') {
      setRuleCount(SALES_RULES.length);
      setAliasCount(SALES_ALIASES.length);
    }
  }, []);

  // 품목 제외 수: ref_excluded + sales_rules 중 category='품목제외' 합산
  useEffect(() => {
    let ignore = false;

    initDB()
      .then(async () => {
        const [excl, rules] = await Promise.all([getUserExcluded(), getUserRules()]);
        if (ignore) return;

        setExcludeCount(excl.length + rules.filter(r => r.category === '품목제외').length);
      })
      .catch(err => {
        if (ignore) return;

        console.error('[settings] 제외 수 조회 실패:', err);
        setExcludeLoadFailed(true);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴 판매량', '분류 규칙']}
        title="분류 규칙 / 정책"
        sub="기본 정책 + 사용자 정의 별칭·규칙·제외를 관리합니다. 미매칭 관리에서 추가한 규칙도 여기에 나타납니다."
      />

      {/* 요약 KPI */}
      <div className="hero-row" style={{marginTop:16}}>
        <SummaryCard
          label="분류 규칙"
          value={ruleCount}
          sub="기본 + MS9 + 추가 규칙 합계"
        />
        <SummaryCard
          label="별칭 매핑"
          value={aliasCount}
          sub="동의어 → 표준 메뉴명"
        />
        <SummaryCard
          label="품목 제외"
          value={excludeLoadFailed ? '-' : excludeCount}
          sub="집계·순위에서 자동 제외"
        />
      </div>

      {/* 탭 */}
      <div style={{
        display:'flex', gap:4, marginTop:24,
        borderBottom:'1px solid var(--border)',
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding:'10px 18px', fontWeight:600, fontSize:14,
              border:'none', background:'transparent', cursor:'pointer',
              color: tab === t.key ? 'var(--accent)' : 'var(--text-3)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'rule'    && <SettingsRuleCard />}
      {tab === 'alias'   && <SettingsAliasCard />}
      {tab === 'exclude' && <SettingsExcludeCard />}
    </main>
  );
}

function SummaryCard({ label, value, sub }) {
  const hasUnit = typeof value !== 'string';

  return (
    <div className="card kpi-card">
      <div>
        <div className="label">{label}</div>
        <div className="value num">
          {hasUnit ? formatNumber(value) : value}
          {hasUnit && <span className="unit">개</span>}
        </div>
        <div className="trend"><span style={{color:'var(--text-3)'}}>{sub}</span></div>
      </div>
    </div>
  );
}
