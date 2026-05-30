export function CalendarSkeleton() {
  return (
    <div className="card" style={{ padding:0, overflow:'hidden', marginTop:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--divider)' }}>
        {['일','월','화','수','목','금','토'].map(w => (
          <div key={w} style={{ padding:'10px 0', textAlign:'center', fontSize:11, color:'var(--text-4)' }}>{w}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
        {Array.from({length:35}).map((_, i) => (
          <div key={i} style={{ height:90, borderRight:'1px solid var(--divider)', borderBottom:'1px solid var(--divider)',
            background:'var(--surface-2)', animation:'shimmer 1.4s infinite linear',
            backgroundImage:'linear-gradient(90deg,var(--surface-2),var(--border),var(--surface-2))',
            backgroundSize:'200% 100%' }}/>
        ))}
      </div>
    </div>
  );
}
