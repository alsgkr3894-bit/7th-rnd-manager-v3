'use client';
import { Icon } from '@/components/icons';
import { STATUS_COLORS, STATUS_BORDER } from '@/lib/note';

export function SampleStatsWidget({ samples, router }) {
  if (!samples || samples.length === 0) return null;
  const rated = samples.filter(s => s.rating > 0);
  const avg = rated.length > 0 ? rated.reduce((a, s) => a + s.rating, 0) / rated.length : 0;
  const withPhoto = samples.filter(s => (s.photos?.length || 0) > 0).length;
  const recent = [...samples].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">샘플기록</div>
          <div className="card-sub">
            총 {samples.length}개 · 사진 {withPhoto}개 · 평균 {avg.toFixed(1)}점
          </div>
        </div>
        <button className="link accent" onClick={() => router.push('/note/sample')}>전체 →</button>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:6}}>
        {recent.map(s => (
          <div key={s.id}
            onClick={() => router.push(`/note/sample/${s.id}`)}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'8px 12px', borderRadius:8,
              background:'var(--surface-2)', cursor:'pointer',
            }}
          >
            {s.photos?.[0] ? (
              <img src={s.photos[0].data} alt=""
                style={{width:40, height:32, objectFit:'cover', borderRadius:6, flexShrink:0}}/>
            ) : (
              <div style={{width:40, height:32, borderRadius:6, background:'var(--border)',
                display:'grid', placeItems:'center', fontSize:14, flexShrink:0}}>📷</div>
            )}
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13, fontWeight:600, color:'var(--text-1)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>{s.title}</div>
              <div style={{fontSize:11, color:'var(--text-3)'}}>{s.menuName}</div>
            </div>
            {s.rating > 0 && (
              <span style={{fontSize:11, color:'#F5A623', flexShrink:0, letterSpacing:1}}>
                {'★'.repeat(s.rating)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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

export function ReportingNotesWidget({ notes, router }) {
  if (!notes || notes.length === 0) return null;
  const sc = STATUS_COLORS['보고예정'];
  const sb = STATUS_BORDER['보고예정'];
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">보고예정 노트</div>
          <div className="card-sub">{notes.length}개 대기 중</div>
        </div>
        <button className="link accent" onClick={() => router.push('/note')}>전체 →</button>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:6}}>
        {notes.slice(0, 5).map(n => (
          <div key={n.id}
            onClick={() => router.push(`/note/${n.id}`)}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'8px 12px', borderRadius:8,
              background:'var(--surface-2)', cursor:'pointer',
              borderLeft:`3px solid ${sb}`,
            }}
          >
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13, fontWeight:600, color:'var(--text-1)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>{n.title}</div>
              <div style={{fontSize:11, color:'var(--text-3)'}}>{n.menuName}</div>
            </div>
            <span style={{
              fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, flexShrink:0,
              background:sc.bg, color:sc.color,
            }}>보고예정</span>
          </div>
        ))}
        {notes.length > 5 && (
          <div style={{textAlign:'center', fontSize:12, color:'var(--text-3)', padding:'4px 0'}}>
            외 {notes.length - 5}개
          </div>
        )}
      </div>
    </div>
  );
}
