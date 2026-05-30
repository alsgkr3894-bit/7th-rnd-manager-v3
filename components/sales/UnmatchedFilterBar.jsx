export function UnmatchedFilterBar({
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
