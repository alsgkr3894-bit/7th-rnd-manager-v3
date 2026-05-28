export function TabButton({ active, onClick, badge, children }) {
  return (
    <button onClick={onClick} style={{
      padding:'10px 18px', border:0,
      background:'transparent', cursor:'pointer',
      fontSize:13, fontWeight: active ? 700 : 500,
      color: active ? 'var(--accent)' : 'var(--text-3)',
      borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      marginBottom:-1,
      display:'flex', alignItems:'center', gap:6,
    }}>
      {children}
      {badge != null && (
        <span style={{
          padding:'1px 7px', fontSize:11, fontWeight:700, borderRadius:999,
          background: active ? 'var(--accent)' : 'var(--warn-soft)',
          color: active ? '#fff' : 'var(--warn)',
        }}>{badge}</span>
      )}
    </button>
  );
}
