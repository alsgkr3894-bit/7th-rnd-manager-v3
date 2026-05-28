export function Skeleton({ width = '100%', height = 16, radius = 6, style }) {
  return (
    <div style={{
      width, height,
      borderRadius: radius,
      background: 'var(--surface-2)',
      backgroundImage: 'linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }}/>
  );
}

export function NoteCardSkeleton() {
  return (
    <div className="card" style={{ borderLeft:'4px solid var(--border)', padding:'16px 18px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <Skeleton width="55%" height={14}/>
        <Skeleton width={48} height={20} radius={8}/>
      </div>
      <Skeleton width="40%" height={12} style={{ marginBottom:10 }}/>
      <Skeleton width="100%" height={12} style={{ marginBottom:6 }}/>
      <Skeleton width="80%" height={12} style={{ marginBottom:14 }}/>
      <div style={{ display:'flex', gap:6 }}>
        <Skeleton width={44} height={22} radius={8}/>
        <Skeleton width={44} height={22} radius={8}/>
        <Skeleton width={44} height={22} radius={8}/>
      </div>
    </div>
  );
}

export function NoteDetailSkeleton() {
  return (
    <main className="main">
      <div style={{ marginBottom: 24 }}>
        <Skeleton width={180} height={12} style={{ marginBottom: 10 }} />
        <Skeleton width="55%" height={22} style={{ marginBottom: 8 }} />
        <Skeleton width="35%" height={13} />
      </div>
      <div className="card" style={{ padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i}>
              <Skeleton width="45%" height={11} style={{ marginBottom: 8 }} />
              <Skeleton height={36} radius={8} />
            </div>
          ))}
        </div>
        <Skeleton width="40%" height={11} style={{ marginBottom: 8 }} />
        <Skeleton height={110} radius={8} />
      </div>
      <div className="card" style={{ padding: '20px 24px' }}>
        <Skeleton width="30%" height={11} style={{ marginBottom: 12 }} />
        <Skeleton height={80} radius={8} />
      </div>
    </main>
  );
}

export function SampleCardSkeleton() {
  return (
    <div className="card" style={{ padding:0, overflow:'hidden' }}>
      <Skeleton height={180} radius={0}/>
      <div style={{ padding:'12px 14px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <Skeleton width="60%" height={14}/>
          <Skeleton width={52} height={12}/>
        </div>
        <Skeleton width="45%" height={12} style={{ marginBottom:8 }}/>
        <Skeleton width="100%" height={11} style={{ marginBottom:4 }}/>
        <Skeleton width="75%" height={11} style={{ marginBottom:12 }}/>
        <div style={{ display:'flex', gap:6 }}>
          <Skeleton width="100%" height={28} radius={8}/>
          <Skeleton width={44} height={28} radius={8}/>
          <Skeleton width={44} height={28} radius={8}/>
        </div>
      </div>
    </div>
  );
}
