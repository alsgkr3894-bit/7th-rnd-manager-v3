'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SALES_ALIASES, SALES_RULES } from '@/lib/sales';
import { SettingsAliasCard } from '@/components/sales/SettingsAliasCard';
import { SettingsExcludeCard } from '@/components/sales/SettingsExcludeCard';
import { SettingsRuleCard } from '@/components/sales/SettingsRuleCard';
import { formatNumber } from '@/lib/format';

const TABS = [
  { key: 'rule',    label: '카테고리 분류 규칙' },
  { key: 'alias',   label: '별칭 관리' },
  { key: 'exclude', label: '품목 제외' },
];

export default function Page() {
  const [tab, setTab] = useState('rule');

  const ruleCount    = SALES_RULES.length;
  const aliasCount   = SALES_ALIASES.length;
  const excludeCount = SALES_RULES.filter(r => r.category === '품목제외').length;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴 판매량', '설정']}
        title="메뉴판매량 설정"
        sub="분류 규칙·별칭·품목 제외 정책을 확인할 수 있어요. 추가/수정은 추후 지원 예정"
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
          value={excludeCount}
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
  return (
    <div className="card kpi-card">
      <div>
        <div className="label">{label}</div>
        <div className="value num">{formatNumber(value)}<span className="unit">개</span></div>
        <div className="trend"><span style={{color:'var(--text-3)'}}>{sub}</span></div>
      </div>
    </div>
  );
}
