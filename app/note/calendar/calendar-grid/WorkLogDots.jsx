import { WORK_LOG_TYPES } from '@/lib/work-log';

export function WorkLogDots({ logs }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 3, flexWrap: 'wrap' }}>
      {[...new Set(logs.map(log => log.type))].slice(0, 4).map(type => {
        const meta = WORK_LOG_TYPES[type] || WORK_LOG_TYPES.OTHER;
        return (
          <span
            key={type}
            title={meta.label}
            style={{
              fontSize: 9,
              background: 'var(--surface-2)',
              borderRadius: 3,
              padding: '1px 4px',
              color: 'var(--text-3)',
              fontWeight: 600,
            }}
          >
            {meta.icon}
          </span>
        );
      })}
    </div>
  );
}
