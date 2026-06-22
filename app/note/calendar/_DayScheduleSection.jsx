'use client';
import { Icon } from '@/components/icons';
import { SCHEDULE_COLORS } from '@/lib/note/schedules';
import { asDisplayText } from '@/lib/ui/prop-guards';

export function DayScheduleSection({ schedules, canEdit = false, onAdd, onEdit }) {
  const sortedSchedules = [...schedules].sort((a, b) =>
    asDisplayText(a.time, '99:99').localeCompare(asDisplayText(b.time, '99:99'))
  );

  return (
    <div style={{ marginBottom: schedules.length ? 12 : 0 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          일정 {schedules.length > 0 ? `· ${schedules.length}` : ''}
        </span>
        <button className="btn sm ghost xs" onClick={onAdd} disabled={!canEdit}>
          + 추가
        </button>
      </div>
      {sortedSchedules.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sortedSchedules.map((schedule, i) => (
            <ScheduleItem
              key={asDisplayText(schedule.id, `schedule-${i}`)}
              schedule={schedule}
              canEdit={canEdit}
              onEdit={onEdit}
            />
          ))}
        </div>
      ) : (
        <button
          className="btn sm ghost"
          style={{
            width: '100%',
            textAlign: 'left',
            fontSize: 12,
            color: 'var(--text-4)',
            justifyContent: 'flex-start',
          }}
          onClick={onAdd}
          disabled={!canEdit}
        >
          + 일정 추가하기
        </button>
      )}
    </div>
  );
}

function ScheduleItem({ schedule, canEdit = false, onEdit }) {
  const type = asDisplayText(schedule.type, '기타');
  const time = asDisplayText(schedule.time);
  const title = asDisplayText(schedule.title, '(제목 없음)');
  const description = asDisplayText(schedule.description);
  const c = SCHEDULE_COLORS[type] || SCHEDULE_COLORS['기타'];

  return (
    <button
      disabled={!canEdit}
      onClick={() => onEdit(schedule)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '9px 11px',
        borderRadius: 10,
        border: 'none',
        cursor: canEdit ? 'pointer' : 'not-allowed',
        font: 'inherit',
        background: 'var(--surface-2)',
        textAlign: 'left',
        width: '100%',
        borderLeft: `3px solid ${c.border}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 99,
              background: c.bg,
              color: c.text,
            }}
          >
            {type}
          </span>
          {time && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{time}</span>
          )}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{title}</div>
        {description && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, lineHeight: 1.4 }}>
            {description}
          </div>
        )}
      </div>
      <Icon.chevRight
        style={{
          width: 13,
          height: 13,
          color: 'var(--text-4)',
          flexShrink: 0,
          marginTop: 2,
        }}
      />
    </button>
  );
}
