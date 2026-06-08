'use client';
import { Icon } from '@/components/icons';
import {
  buildModuleHealth,
  countModuleHealth,
} from '@/lib/stats/module-health';

const TONE = {
  good: {
    label: '정상',
    color: 'var(--positive)',
    bg: 'var(--positive-soft)',
    border: 'rgba(16,185,129,.25)',
    icon: Icon.check,
  },
  warn: {
    label: '확인',
    color: 'var(--warn)',
    bg: 'var(--warn-soft)',
    border: 'rgba(245,158,11,.28)',
    icon: Icon.alert,
  },
  bad: {
    label: '조치',
    color: 'var(--negative)',
    bg: 'var(--negative-soft)',
    border: 'rgba(239,68,68,.25)',
    icon: Icon.alert,
  },
};

function HealthBadge({ status }) {
  const tone = TONE[status] || TONE.warn;
  const StatusIcon = tone.icon;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 800,
      color: tone.color,
      background: tone.bg,
      border: `1px solid ${tone.border}`,
      whiteSpace: 'nowrap',
    }}>
      <StatusIcon style={{ width: 12, height: 12 }} />
      {tone.label}
    </span>
  );
}

function summaryText(counts) {
  if (counts.bad > 0) return `${counts.bad}개 조치 필요 · ${counts.warn}개 확인`;
  if (counts.warn > 0) return `${counts.warn}개 확인 필요`;
  return '모든 모듈 정상';
}

export function ModuleHealthWidget({
  freshness,
  backupReminder,
  issues,
  costAlertData,
  todos,
  pipeline,
  isMain,
  router,
}) {
  const modules = buildModuleHealth({
    freshness,
    backupReminder,
    issues,
    costAlertData,
    todos,
    pipeline,
    isMain,
  });
  const counts = countModuleHealth(modules);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card-header">
        <div>
          <div className="card-title">모듈별 헬스체크</div>
          <div className="card-sub">{summaryText(counts)}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--positive)', fontWeight: 800 }}>정상 {counts.good}</span>
          <span style={{ fontSize: 11, color: 'var(--warn)', fontWeight: 800 }}>확인 {counts.warn}</span>
          <span style={{ fontSize: 11, color: 'var(--negative)', fontWeight: 800 }}>조치 {counts.bad}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
        {modules.map(module => {
          const tone = TONE[module.status] || TONE.warn;
          const StatusIcon = tone.icon;
          return (
            <button
              key={module.id}
              className="widget-row"
              onClick={() => router.push(module.href)}
              style={{
                display: 'grid',
                gridTemplateRows: 'auto 1fr auto',
                gap: 8,
                minHeight: 118,
                padding: '12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface)',
                textAlign: 'left',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{
                    width: 28,
                    height: 28,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 8,
                    color: tone.color,
                    background: tone.bg,
                    border: `1px solid ${tone.border}`,
                    flexShrink: 0,
                  }}>
                    <StatusIcon style={{ width: 15, height: 15 }} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {module.label}
                  </span>
                </span>
                <HealthBadge status={module.status} />
              </span>

              <span style={{ display: 'block', minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 17, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.25 }}>
                  {module.metric}
                </span>
                <span style={{ display: 'block', marginTop: 5, fontSize: 11, lineHeight: 1.45, color: 'var(--text-3)' }}>
                  {module.detail}
                </span>
              </span>

              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                확인하기 <Icon.chevRight style={{ width: 13, height: 13 }} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
