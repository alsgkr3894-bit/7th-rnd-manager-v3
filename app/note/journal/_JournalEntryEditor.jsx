'use client';

import { Icon } from '@/components/icons';
import { NotePhotoSection } from '@/app/note/_NotePhotoSection';

function Field({ label, action, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function TextArea({ value, onChange, disabled, placeholder, rows = 6 }) {
  return (
    <textarea
      className="form-input"
      rows={rows}
      value={value}
      onChange={event => onChange(event.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      style={{ resize: 'vertical', minHeight: rows * 34, fontSize: 14, lineHeight: 1.6 }}
    />
  );
}

function ScheduleList({ schedules }) {
  if (!schedules.length) {
    return <div style={{ fontSize: 13, color: 'var(--text-3)' }}>등록된 일정 없음</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {schedules.map(schedule => (
        <div
          key={`${schedule.id}-${schedule._occurrenceDate || schedule.date}`}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 10px',
            background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {schedule.time && (
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)' }}>
                {schedule.time}
              </span>
            )}
            <span style={{ fontSize: 13, fontWeight: 700 }}>{schedule.title}</span>
          </div>
          {(schedule.type || schedule.description) && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
              {[schedule.type, schedule.description].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function JournalEntryEditor({
  dateLabel,
  form,
  onChange,
  onUseSchedules,
  onScrollToRecords,
  saving = false,
  canEdit = false,
  existingEntry = null,
  dirty = false,
  daySchedules = [],
}) {
  const disabled = !canEdit || saving;

  return (
    <section
      className="card"
      style={{
        padding: 18,
        marginTop: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="card-title">오늘 내용 보고서 작성</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{dateLabel}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {dirty ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--warn)',
                background: 'var(--warn-soft)',
                borderRadius: 999,
                padding: '3px 8px',
              }}
            >
              수정 중
            </span>
          ) : (
            existingEntry && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--positive)',
                  background: 'var(--positive-soft)',
                  borderRadius: 999,
                  padding: '3px 8px',
                }}
              >
                저장됨
              </span>
            )
          )}
          {onScrollToRecords && (
            <button type="button" className="btn sm" onClick={onScrollToRecords}>
              저장된 일지 보기
            </button>
          )}
        </div>
      </div>

      <Field
        label="오늘 내용 보고서"
        action={
          <button
            type="button"
            className="btn sm"
            onClick={onUseSchedules}
            disabled={disabled || !daySchedules.length}
          >
            <Icon.copy style={{ width: 12, height: 12 }} /> 일정 불러오기
          </button>
        }
      >
        <TextArea
          value={form.report}
          onChange={value => onChange('report', value)}
          disabled={disabled}
          rows={12}
          placeholder="오늘 한 일, 테스트 결과, 다음 일정을 한 번에 적으세요"
        />
        {daySchedules.length > 0 && (
          <details>
            <summary style={{ fontSize: 12, color: 'var(--text-3)', cursor: 'pointer' }}>
              선택 날짜 일정 {daySchedules.length}건
            </summary>
            <div style={{ marginTop: 8 }}>
              <ScheduleList schedules={daySchedules} />
            </div>
          </details>
        )}
      </Field>

      <NotePhotoSection
        photos={form.photos || []}
        onChange={value => onChange('photos', value)}
        disabled={disabled}
      />
    </section>
  );
}
