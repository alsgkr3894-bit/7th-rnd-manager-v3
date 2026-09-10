'use client';
import { useState } from 'react';
import { Icon } from '@/components/icons';
import { WORK_LOG_TYPES } from '@/lib/work-log';
import { asDisplayText } from '@/lib/ui/prop-guards';

function groupLogsByType(logs) {
  const byType = new Map();
  for (const log of logs) {
    const type = asDisplayText(log.type) || 'OTHER';
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(log);
  }
  for (const group of byType.values()) {
    group.sort((a, b) => asDisplayText(b.at).localeCompare(asDisplayText(a.at)));
  }
  // 개수 많은 유형(가장 활발했던 작업)이 먼저 보이도록 정렬
  return Array.from(byType.entries()).sort((a, b) => b[1].length - a[1].length);
}

export function DayWorkLogSection({ logs, open, onToggle }) {
  const groups = groupLogsByType(logs || []);
  const total = (logs || []).length;

  if (total === 0) return null;

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
        자동 일지 · {total}
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
          {groups.map(([type, groupLogs]) => (
            <WorkLogTypeGroup key={type} type={type} logs={groupLogs} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkLogTypeGroup({ type, logs }) {
  const [expanded, setExpanded] = useState(false);
  const t = WORK_LOG_TYPES[type] || WORK_LOG_TYPES.OTHER;
  const single = logs.length === 1;

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        disabled={single}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '6px 10px',
          borderRadius: 8,
          background: 'var(--surface-2)',
          border: 'none',
          cursor: single ? 'default' : 'pointer',
          font: 'inherit',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 13, flexShrink: 0 }}>{t.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.color }}>{t.label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>
            {logs.length}건{single ? ` · ${asDisplayText(logs[0].summary)}` : ''}
          </span>
        </div>
        {!single && (
          <Icon.arrowDown
            style={{
              width: 11,
              height: 11,
              flexShrink: 0,
              color: 'var(--text-4)',
              transform: expanded ? 'rotate(180deg)' : undefined,
              transition: 'transform 0.15s',
            }}
          />
        )}
      </button>
      {!single && expanded && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, paddingLeft: 8 }}
        >
          {logs.map((log, i) => (
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
