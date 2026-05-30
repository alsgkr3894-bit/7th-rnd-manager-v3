'use client';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUnmatchedIssues } from '@/lib/sales/use-unmatched-issues';
import { UnmatchedSummary } from '@/components/sales/UnmatchedSummary';
import { UnmatchedTable } from '@/components/sales/UnmatchedTable';
import {
  UnmatchedAllResolved,
  UnmatchedNoMatch,
  UnmatchedSkeleton,
} from '@/components/sales/UnmatchedEmpty';
import { UnmatchedFilterBar } from '@/components/sales/UnmatchedFilterBar';

export default function Page() {
  const { ready, issues, resolve, bulkExclude } = useUnmatchedIssues();
  const [statusFilter, setStatusFilter] = useState('open'); // open | resolved | all
  const [monthFilter, setMonthFilter] = useState('all');     // 'all' | 'YYYY-M'

  const months = useMemo(() => {
    const seen = new Map();
    for (const i of issues) {
      const k = `${i.year}-${i.month}`;
      if (!seen.has(k)) seen.set(k, { year: i.year, month: i.month, key: k });
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.year !== b.year ? b.year - a.year : b.month - a.month
    );
  }, [issues]);

  const filtered = useMemo(() => {
    return issues.filter(i => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (monthFilter !== 'all') {
        const [y, m] = monthFilter.split('-').map(Number);
        if (i.year !== y || i.month !== m) return false;
      }
      return true;
    });
  }, [issues, statusFilter, monthFilter]);

  const openCount     = issues.filter(i => i.status === 'open').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴 판매량', '미매칭 관리']}
        title="미매칭 관리"
        sub="분류 규칙으로 매칭되지 않은 메뉴를 확인할 수 있어요"
      />

      <UnmatchedSummary
        openCount={openCount}
        resolvedCount={resolvedCount}
        months={months}
      />

      {issues.length > 0 && (
        <UnmatchedFilterBar
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          monthFilter={monthFilter}
          onMonthChange={setMonthFilter}
          openCount={openCount}
          resolvedCount={resolvedCount}
          totalCount={issues.length}
          months={months}
        />
      )}

      {!ready
        ? <UnmatchedSkeleton />
        : issues.length === 0
          ? <UnmatchedAllResolved />
          : filtered.length === 0
            ? <UnmatchedNoMatch />
            : <UnmatchedTable issues={filtered} onResolve={resolve} onBulkExclude={bulkExclude} />}
    </main>
  );
}
