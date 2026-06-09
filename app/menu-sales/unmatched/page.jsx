'use client';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/icons';
import { useUnmatchedIssues } from '@/lib/sales/use-unmatched-issues';
import { UnmatchedSummary } from '@/components/sales/UnmatchedSummary';
import { UnmatchedTable } from '@/components/sales/UnmatchedTable';
import {
  UnmatchedAllResolved,
  UnmatchedNoMatch,
  UnmatchedSkeleton,
} from '@/components/sales/UnmatchedEmpty';
import { UnmatchedFilterBar } from '@/components/sales/UnmatchedFilterBar';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

const STATUS_FILTERS = new Set(['open', 'resolved', 'all']);

function safeStatusFilter(value) {
  const requested = asDisplayText(value, 'open');
  return STATUS_FILTERS.has(requested) ? requested : 'open';
}

function safePeriod(issue) {
  const year = asFiniteNumber(issue?.year, null);
  const month = asFiniteNumber(issue?.month, null);
  if (year == null || month == null || month < 1 || month > 12) return null;
  return { year: Math.floor(year), month: Math.floor(month) };
}

export default function Page() {
  const { ready, issues, resolve, bulkExclude, bulkRule } = useUnmatchedIssues();
  const [statusFilter, setStatusFilter] = useState('open'); // open | resolved | all
  const [monthFilter, setMonthFilter] = useState('all'); // 'all' | 'YYYY-M'
  const [search, setSearch] = useState('');
  const safeIssues = useMemo(() => asObjectArray(issues), [issues]);
  const selectedStatus = safeStatusFilter(statusFilter);
  const selectedMonth = asDisplayText(monthFilter, 'all') || 'all';

  const months = useMemo(() => {
    const seen = new Map();
    for (const issue of safeIssues) {
      const period = safePeriod(issue);
      if (!period) continue;
      const k = `${period.year}-${period.month}`;
      if (!seen.has(k)) seen.set(k, { ...period, key: k });
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.year !== b.year ? b.year - a.year : b.month - a.month
    );
  }, [safeIssues]);

  const filtered = useMemo(() => {
    const q = asDisplayText(search).trim().toLowerCase();
    return safeIssues.filter(i => {
      if (selectedStatus !== 'all' && asDisplayText(i.status) !== selectedStatus) return false;
      if (selectedMonth !== 'all') {
        const [y, m] = selectedMonth.split('-').map(Number);
        const period = safePeriod(i);
        if (!period || period.year !== y || period.month !== m) return false;
      }
      if (q) {
        const raw = asDisplayText(i.representativeRawMenuName).toLowerCase();
        const norm = asDisplayText(i.normalizedMenuName).toLowerCase();
        if (!raw.includes(q) && !norm.includes(q)) return false;
      }
      return true;
    });
  }, [safeIssues, selectedStatus, selectedMonth, search]);

  const openCount = safeIssues.filter(i => asDisplayText(i.status) === 'open').length;
  const resolvedCount = safeIssues.filter(i => asDisplayText(i.status) === 'resolved').length;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴 판매량', '미매칭 관리']}
        title="미매칭 관리"
        sub="분류 규칙으로 매칭되지 않은 메뉴를 확인할 수 있어요"
      />

      <UnmatchedSummary openCount={openCount} resolvedCount={resolvedCount} months={months} />

      {safeIssues.length > 0 && (
        <div className="filter-search" style={{ marginTop: 12, marginBottom: 4 }}>
          <Icon.search style={{ width: 14, height: 14, color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="메뉴명 검색 (원본 / 정규화)"
          />
        </div>
      )}

      {safeIssues.length > 0 && (
        <UnmatchedFilterBar
          statusFilter={selectedStatus}
          onStatusChange={setStatusFilter}
          monthFilter={selectedMonth}
          onMonthChange={setMonthFilter}
          openCount={openCount}
          resolvedCount={resolvedCount}
          totalCount={safeIssues.length}
          months={months}
        />
      )}

      {!ready ? (
        <UnmatchedSkeleton />
      ) : safeIssues.length === 0 ? (
        <UnmatchedAllResolved />
      ) : filtered.length === 0 ? (
        <UnmatchedNoMatch />
      ) : (
        <UnmatchedTable
          issues={filtered}
          onResolve={resolve}
          onBulkExclude={bulkExclude}
          onBulkRule={bulkRule}
        />
      )}
    </main>
  );
}
