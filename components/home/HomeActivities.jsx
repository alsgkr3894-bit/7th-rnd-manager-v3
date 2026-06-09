'use client';
import { Icon } from '@/components/icons';
import { formatRelative } from '@/lib/format';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { EmptyState, rowButtonStyle } from './HomeWidgets';

const ACT_META = {
  'upload-sales': { ico: <Icon.upload style={{width:18,height:18}}/>, color: 'var(--accent-text)', bg: 'var(--accent-soft)' },
  'upload-jette': { ico: <Icon.upload style={{width:18,height:18}}/>, color: 'var(--accent)',      bg: 'var(--accent-soft)' },
  'upload':       { ico: <Icon.upload style={{width:18,height:18}}/>, color: 'var(--text-2)',      bg: 'var(--surface-2)' },
  'note':         { ico: <Icon.beaker style={{width:18,height:18}}/>, color: 'var(--accent)',      bg: 'var(--accent-soft)' },
};

function activityHref(type) {
  switch (type) {
    case 'upload-sales': return '/menu-sales/upload';
    case 'upload-jette': return '/jette/price-compare';
    case 'note':         return '/note';
    default:             return null;
  }
}

export function HomeActivities({ activities, router }) {
  const safeActivities = asObjectArray(activities);

  return (
    <div className="motion-stagger" style={{marginTop:16}}>
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">최근 활동</div><div className="card-sub">업로드 · 노트</div></div>
        </div>
        {safeActivities.length === 0 ? (
          <EmptyState
            icon={<Icon.note style={{width:32,height:32}}/>}
            title="아직 활동 기록이 없습니다"
            desc="업로드 또는 노트 작성 시 여기에 표시됩니다"
            compact
          />
        ) : (
          <div className="tx-list">
            {safeActivities.map((a, i) => {
              const type = asDisplayText(a.type);
              const title = asDisplayText(a.title);
              const sub = asDisplayText(a.sub);
              const m = ACT_META[type] || ACT_META['upload'];
              const href = activityHref(type);
              return (
                <button key={i} className="tx-row"
                  onClick={() => href && router?.push?.(href)}
                  style={{
                    gridTemplateColumns:'36px 1fr 80px 16px', padding:'12px 4px',
                    ...rowButtonStyle,
                    cursor: href ? 'pointer' : 'default',
                  }}
                  disabled={!href}
                >
                  <div className="ico" style={{background:m.bg,color:m.color}}>{m.ico}</div>
                  <div className="meta">
                    <div className="who" style={{fontSize:13}}>{title}</div>
                    {sub && <div className="desc">{sub}</div>}
                  </div>
                  <div className="acct" style={{fontSize:12,textAlign:'right'}}>{formatRelative(a.when)}</div>
                  <div className="chev"><Icon.chevRight style={{width:12,height:12}}/></div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
