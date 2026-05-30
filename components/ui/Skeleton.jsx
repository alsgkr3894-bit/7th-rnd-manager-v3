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

// cols: number of columns to render per row
export function SkeletonTableRows({ rows = 5, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding:'10px 12px' }}>
              <Skeleton height={13} width={j === 0 ? '60%' : j === cols - 1 ? 40 : '85%'} radius={4}/>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function IngredientPriceSkeleton() {
  // Matches: 제품코드 | 제품명 | 부가세포함가 | 포장단위 | 개당단가 | 단가변동 | (icon) | (btn)
  const colWidths = ['60%', '80%', '55%', '65%', '55%', '50%', 24, 32];
  return (
    <div className="card table-card">
      <div style={{ overflowX:'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width:90 }}><Skeleton width="70%" height={11}/></th>
              <th><Skeleton width="50%" height={11}/></th>
              <th style={{ width:120 }}><Skeleton width="70%" height={11}/></th>
              <th style={{ width:100 }}><Skeleton width="60%" height={11}/></th>
              <th style={{ width:120 }}><Skeleton width="70%" height={11}/></th>
              <th style={{ width:110 }}><Skeleton width="60%" height={11}/></th>
              <th style={{ width:30 }}/>
              <th style={{ width:60 }}/>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {colWidths.map((w, j) => (
                  <td key={j} style={{ padding:'10px 12px' }}>
                    {typeof w === 'number'
                      ? <Skeleton width={w} height={13} radius={4}/>
                      : <Skeleton width={w} height={13} radius={4}/>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding:'8px 16px', borderTop:'1px solid var(--divider)' }}>
        <Skeleton width={120} height={11}/>
      </div>
    </div>
  );
}

export function IngredientListSkeleton() {
  // Matches: 제품코드 | 재료명 | 분류 | #태그 | 전용/범용 | 단위 | G·개당단가 | 제조사 | 상태
  const colWidths = ['55%', '75%', '65%', '80%', '60%', '40%', '60%', '60%', '50%'];
  return (
    <div className="card table-card">
      <div style={{ overflowX:'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width:80 }}><Skeleton width="70%" height={11}/></th>
              <th><Skeleton width="50%" height={11}/></th>
              <th style={{ width:96 }}><Skeleton width="60%" height={11}/></th>
              <th style={{ width:160 }}><Skeleton width="50%" height={11}/></th>
              <th style={{ width:80 }}><Skeleton width="65%" height={11}/></th>
              <th style={{ width:56 }}><Skeleton width="60%" height={11}/></th>
              <th style={{ width:110 }}><Skeleton width="70%" height={11}/></th>
              <th style={{ width:88 }}><Skeleton width="60%" height={11}/></th>
              <th style={{ width:80 }}><Skeleton width="50%" height={11}/></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {colWidths.map((w, j) => (
                  <td key={j} style={{ padding:'10px 12px' }}>
                    <Skeleton width={w} height={13} radius={4}/>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding:'8px 16px', borderTop:'1px solid var(--divider)' }}>
        <Skeleton width={120} height={11}/>
      </div>
    </div>
  );
}
