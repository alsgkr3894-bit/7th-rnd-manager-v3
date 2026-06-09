import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function UnmatchedFilterBar({
  statusFilter, onStatusChange,
  monthFilter, onMonthChange,
  openCount, resolvedCount, totalCount, months,
}) {
  const safeMonths = asObjectArray(months);
  const handleStatusChange = typeof onStatusChange === 'function' ? onStatusChange : () => {};
  const handleMonthChange = typeof onMonthChange === 'function' ? onMonthChange : () => {};
  const safeMonthFilter = asDisplayText(monthFilter, 'all');

  return (
    <div style={{display:'flex', gap:8, marginTop:16, flexWrap:'wrap', alignItems:'center'}}>
      <FilterChip label="미해결"  count={openCount}     active={statusFilter === 'open'}     onClick={() => handleStatusChange('open')}/>
      <FilterChip label="해결됨"  count={resolvedCount} active={statusFilter === 'resolved'} onClick={() => handleStatusChange('resolved')}/>
      <FilterChip label="전체"    count={totalCount}    active={statusFilter === 'all'}      onClick={() => handleStatusChange('all')}/>

      <div style={{flex:1}}/>

      <select
        value={safeMonthFilter}
        onChange={e => handleMonthChange(e.target.value)}
        style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 10px', fontSize: 13, fontWeight: 600,
          color: 'var(--text-1)',
        }}
      >
        <option value="all">전체 월</option>
        {safeMonths.map((m, index) => {
          const key = asDisplayText(m.key, `month-${index}`);
          return (
            <option key={key} value={key}>
              {asDisplayText(m.year, '-')}년 {asDisplayText(m.month, '-')}월
            </option>
          );
        })}
      </select>
    </div>
  );
}

function FilterChip({ label, count, active, onClick }) {
  const safeLabel = asDisplayText(label);
  const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
  const handleClick = typeof onClick === 'function' ? onClick : undefined;

  return (
    <button
      onClick={handleClick}
      className="chip"
      style={{
        cursor:'pointer', border:'none',
        background: active ? 'var(--accent)' : 'var(--surface-2)',
        color: active ? '#fff' : 'var(--text-2)',
        fontWeight: 600,
        display:'inline-flex', alignItems:'center', gap:6,
      }}
    >
      {safeLabel}
      <span style={{
        background: active ? 'rgba(255,255,255,0.2)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--text-3)',
        padding:'1px 6px', borderRadius:10, fontSize:11, fontWeight:700,
      }}>{safeCount}</span>
    </button>
  );
}
