import { STATUSES } from '@/lib/note/constants';
import { SCHEDULE_COLORS, SCHEDULE_TYPES } from '@/lib/note/schedules';
import { NOTE_DOT } from './_calendar-utils';

export function CalendarLegend() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        marginTop: 12,
        padding: '10px 16px',
        background: 'var(--surface-2)',
        borderRadius: 10,
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>범례</span>
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>── 노트</span>
      {STATUSES.map(status => (
        <span
          key={status}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: 'var(--text-2)',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: NOTE_DOT[status],
              flexShrink: 0,
            }}
          />
          {status}
        </span>
      ))}
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginLeft: 8 }}>
        ── 일정
      </span>
      {SCHEDULE_TYPES.map(type => {
        const color = SCHEDULE_COLORS[type];
        return (
          <span
            key={type}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: 'var(--text-2)',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                background: color.bg,
                border: `1.5px solid ${color.border}`,
                flexShrink: 0,
              }}
            />
            {type}
          </span>
        );
      })}
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginLeft: 8 }}>
        ── 샘플
      </span>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          color: 'var(--text-2)',
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 2,
            background: 'var(--positive-soft)',
            border: '1.5px solid var(--positive)',
            flexShrink: 0,
          }}
        />
        샘플 수령
      </span>
    </div>
  );
}
