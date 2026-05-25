'use client';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB } from '@/lib/db';
import { getIssues } from '@/lib/sales';
import { formatNumber } from '@/lib/format';

export default function Page() {
  const [ready, setReady] = useState(false);
  const [issues, setIssues] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open'); // open | resolved | all
  const [monthFilter, setMonthFilter] = useState('all'); // 'all' | 'YYYY-M'

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

      {/* 요약 카드 */}
      <div className="hero-row" style={{marginTop:16}}>
        <SummaryCard
          label="미해결 미매칭"
          value={openCount}
          color="var(--negative)"
          sub={openCount === 0 ? '모든 메뉴가 매핑됐어요' : '처리 필요'}
        />
        <SummaryCard
          label="해결된 미매칭"
          value={resolvedCount}
          color="var(--positive)"
          sub="별칭·룰·제외로 처리됨"
        />
        <SummaryCard
          label="업로드된 월 수"
          value={months.length}
          color="var(--accent)"
          sub={months.length === 0 ? '아직 업로드 없음' : `${months[0]?.year}년 ${months[0]?.month}월 ~`}
        />
      </div>

      {/* 필터 */}
      {issues.length > 0 && (
        <div style={{display:'flex', gap:8, marginTop:16, flexWrap:'wrap', alignItems:'center'}}>
          <FilterChip label="미해결" active={statusFilter === 'open'} count={openCount} onClick={() => setStatusFilter('open')} />
          <FilterChip label="해결됨" active={statusFilter === 'resolved'} count={resolvedCount} onClick={() => setStatusFilter('resolved')} />
          <FilterChip label="전체" active={statusFilter === 'all'} count={issues.length} onClick={() => setStatusFilter('all')} />

          <div style={{flex:1}}/>

          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
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
      )}

      {/* 본문 */}
      {!ready ? (
        <SkeletonCard />
      ) : issues.length === 0 ? (
        <EmptyAll />
      ) : filtered.length === 0 ? (
        <EmptyFiltered />
      ) : (
        <IssueTable issues={filtered} />
      )}
    </main>
  );
}

/* ============================================================
   하위 컴포넌트
============================================================ */

function SummaryCard({ label, value, color, sub }) {
  return (
    <div className="card kpi-card">
      <div>
        <div className="label">{label}</div>
        <div className="value num" style={{color}}>{formatNumber(value)}<span className="unit">건</span></div>
        <div className="trend"><span style={{color:'var(--text-3)'}}>{sub}</span></div>
      </div>
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

function IssueTable({ issues }) {
  return (
    <div className="card table-card" style={{marginTop:16}}>
      <div style={{overflowX:'auto'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width:110}}>월</th>
              <th>대표 메뉴명 (원본)</th>
              <th>정규화 후</th>
              <th style={{width:120, textAlign:'right'}}>총 수량</th>
              <th style={{width:120, textAlign:'right'}}>영향 행 수</th>
              <th style={{width:100}}>상태</th>
            </tr>
          </thead>
          <tbody>
            {issues.map(it => (
              <tr key={it.id}>
                <td>
                  <span className="period-pill num">
                    {it.year}.{String(it.month).padStart(2, '0')}
                  </span>
                </td>
                <td className="cell-name"><div className="menu-name">{it.representativeRawMenuName}</div></td>
                <td className="cell-name">
                  <span style={{color:'var(--text-3)', fontSize:12}}>{it.normalizedMenuName}</span>
                </td>
                <td className="num right">{formatNumber(it.totalQuantity)}<span className="unit">개</span></td>
                <td className="num right">{formatNumber(it.affectedRowCount)}</td>
                <td>
                  {it.status === 'open' ? (
                    <span className="chip" style={{background:'var(--negative-soft)', color:'var(--negative)'}}>미해결</span>
                  ) : (
                    <span className="chip" style={{background:'var(--positive-soft)', color:'var(--positive)'}}>해결됨</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyAll() {
  return (
    <div className="card" style={{
      marginTop:16, padding:'56px 24px', textAlign:'center',
      display:'flex', flexDirection:'column', alignItems:'center', gap:12,
    }}>
      <Icon.check style={{width:48, height:48, color:'var(--positive)'}}/>
      <div style={{fontSize:15, fontWeight:700}}>모든 메뉴가 정상 매핑됐습니다</div>
      <div style={{fontSize:13, color:'var(--text-3)'}}>
        업로드된 파일 중 매핑되지 않은 메뉴가 없습니다.<br/>
        새 파일 업로드 시 미매칭이 발생하면 여기에 표시됩니다.
      </div>
    </div>
  );
}

function EmptyFiltered() {
  return (
    <div className="card" style={{
      marginTop:16, padding:'40px 24px', textAlign:'center',
      color:'var(--text-3)', fontSize:13,
    }}>
      조건에 맞는 항목이 없습니다
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card" style={{marginTop:16, height:120, display:'grid', placeItems:'center', color:'var(--text-4)', fontSize:13}}>
      로딩 중…
    </div>
  );
}
