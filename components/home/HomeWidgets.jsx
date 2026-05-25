'use client';
import { Icon } from '@/components/icons';

export const rowButtonStyle = {
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  font: 'inherit',
  width: '100%',
  cursor: 'pointer',
};

export function EmptyState({ icon, title, desc, action, onAction, compact }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding: compact ? '32px 16px' : '48px 24px',
      color:'var(--text-3)', textAlign:'center', gap: 8,
    }}>
      <div style={{color:'var(--text-4)'}}>{icon}</div>
      <div style={{fontSize:14, fontWeight:600, color:'var(--text-2)'}}>{title}</div>
      {desc && <div style={{fontSize:12}}>{desc}</div>}
      {action && (
        <button className="btn primary sm" onClick={onAction} style={{marginTop:8}}>
          {action}
        </button>
      )}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div style={{
      height:180, background:'linear-gradient(90deg, var(--surface-2), var(--border), var(--surface-2))',
      backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite linear', borderRadius:8,
    }}/>
  );
}

export function RankCard({ title, sub, items, emptyTitle, accent, router }) {
  return (
    <div className="card tx-card">
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          <div className="card-sub">{sub}</div>
        </div>
        <button className="link accent" onClick={() => router.push('/menu-sales/rank-compare')}>전체 →</button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={<Icon.chart style={{width:32,height:32}}/>}
          title={emptyTitle}
          desc="판매량 업로드 후 표시됩니다"
          compact
        />
      ) : (
        <div className="rank-list">
          {items.map(r => (
            <button key={r.rank} className="rank-row"
              onClick={() => router.push(`/menu-sales/rank-compare?menu=${encodeURIComponent(r.name)}`)}
              style={rowButtonStyle}
            >
              <div className="rank-num num"
                style={accent === 'down' ? { background: 'var(--negative-soft)', color: 'var(--negative)' } : undefined}
              >{r.rank}</div>
              <div className="rank-name">{r.name}</div>
              <Icon.chevRight className="chev" style={{width:16,height:16}}/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
