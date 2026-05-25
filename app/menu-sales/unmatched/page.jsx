'use client';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getIssues } from '@/lib/sales';
import { UnmatchedSummary } from '@/components/sales/UnmatchedSummary';
import { UnmatchedTable } from '@/components/sales/UnmatchedTable';
import {
  UnmatchedAllResolved,
  UnmatchedNoMatch,
  UnmatchedSkeleton,
} from '@/components/sales/UnmatchedEmpty';

export default function Page() {
  const [ready, setReady] = useState(false);
  const [issues, setIssues] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open'); // open | resolved | all
  const [monthFilter, setMonthFilter] = useState('all');     // 'all' | 'YYYY-M'

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        const all = await getIssues();
        setIssues(all);
        setReady(true);
      } catch (err) {
        console.error('[unmatched] 로드 실패:', err);
        showToast('데이터 로드 실패', 'err');
      }
    })();
  }, []);

  const months = useMemo(() => {
    const set = new Map();
    for (const i of issues) {
      const k = `${i.year}-${i.month}`;
      if (!set.has(k)) set.set(k, { year: i.year, month: i.month, key: k });
    }
    return Array.from(set.values()).sort((a, b) =>
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

  const openCount = issues.filter(i => i.status === 'open').length;
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
        <FilterBar
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
            : <UnmatchedTable issues={filtered} />}
    </main>
  );
}

function FilterBar({
  statusFilter, onStatusChange,
  monthFilter, onMonthChange,
  openCount, resolvedCount, totalCount, months,
}) {
  return (
    <div style={{display:'flex', gap:8, marginTop:16, flexWrap:'wrap', alignItems:'center'}}>
      <FilterChip label="미해결"  count={openCount}     active={statusFilter === 'open'}     onClick={() => onStatusChange('open')}/>
      <FilterChip label="해결됨"  count={resolvedCount} active={statusFilter === 'resolved'} onClick={() => onStatusChange('resolved')}/>
      <FilterChip label="전체"    count={totalCount}    active={statusFilter === 'all'}      onClick={() => onStatusChange('all')}/>

      <div style={{flex:1}}/>

      <select
        value={monthFilter}
        onChange={e => onMonthChange(e.target.value)}
        style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 10px', fontSize: 13, fontWeight: 600,
          color: 'var(--text-1)',
        }}
      >
        <option value="all">전체 월</option>
        {months.map(m => (
          <option key={m.key} value={m.key}>{m.year}년 {m.month}월</option>
        ))}
      </select>
    </div>
  );
}

function FilterChip({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="chip"
      style={{
        cursor:'pointer', border:'none',
        background: active ? 'var(--accent)' : 'var(--surface-2)',
        color: active ? '#fff' : 'var(--text-2)',
        fontWeight: 600,
        display:'inline-flex', alignItems:'center', gap:6,
      }}
    >
      {label}
      <span style={{
        background: active ? 'rgba(255,255,255,0.2)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--text-3)',
        padding:'1px 6px', borderRadius:10, fontSize:11, fontWeight:700,
      }}>{count}</span>
    </button>
  );
}
