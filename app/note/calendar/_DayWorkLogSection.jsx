'use client';
import { Icon } from '@/components/icons';
import { WORK_LOG_TYPES } from '@/lib/work-log';
import { asDisplayText } from '@/lib/ui/prop-guards';

export function DayWorkLogSection({ logs, open, onToggle }) {
  const sortedLogs = [...logs].sort((a, b) =>
    asDisplayText(a.at).localeCompare(asDisplayText(b.at))
  );

  if (sortedLogs.length === 0) return null;

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--divider)', paddingTop: 8 }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          font: 'inherit',
          color: 'var(--text-3)',
          fontSize: 11,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        자동 일지 · {sortedLogs.length}
        <Icon.arrowDown
          style={{
            width: 12,
            height: 12,
            marginLeft: 'auto',
            transform: open ? 'rotate(180deg)' : undefined,
            transition: 'transform 0.15s',
          }}
        />
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {sortedLogs.map((log, i) => (
            <WorkLogItem key={asDisplayText(log.id, `work-${i}`)} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkLogItem({ log }) {
  const type = asDisplayText(log.type);
  const summary = asDisplayText(log.summary);
  const at = asDisplayText(log.at);
  const t = WORK_LOG_TYPES[type] || WORK_LOG_TYPES.OTHER;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 8,
        background: 'var(--surface-2)',
      }}
    >
      <span style={{ fontSize: 13, flexShrink: 0 }}>{t.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.color }}>{t.label}</span>
        {summary && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>{summary}</span>
        )}
      </div>
      <span style={{ fontSize: 10, color: 'var(--text-4)', flexShrink: 0 }}>
        {at.slice(11, 16)}
      </span>
    </div>
  );
}
