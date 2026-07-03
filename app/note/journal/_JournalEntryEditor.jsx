'use client';

import { Icon } from '@/components/icons';
import { NotePhotoSection } from '@/app/note/_NotePhotoSection';

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>{label}</span>
      {children}
    </label>
  );
}

function TextArea({ value, onChange, disabled, placeholder, rows = 3 }) {
  return (
    <textarea
      className="form-input"
      rows={rows}
      value={value}
      onChange={event => onChange(event.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      style={{ resize: 'vertical', minHeight: rows * 34 }}
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
  onSave,
  onUseSchedules,
  saving = false,
  canEdit = false,
  existingEntry = null,
  daySchedules = [],
}) {
  const disabled = !canEdit || saving;

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: 14,
          alignItems: 'start',
          marginTop: 16,
        }}
      >
        <section className="card" style={{ padding: 18 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <div className="card-title">오늘 한 일 보고서 작성</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{dateLabel}</div>
          </div>
          {existingEntry && (
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
          )}
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="1. 오늘 한 일">
            <TextArea
              value={form.work}
              onChange={value => onChange('work', value)}
              disabled={disabled}
              rows={4}
              placeholder="작업한 내용, 변경한 메뉴, 확인한 데이터를 적으세요"
            />
          </Field>
          <Field label="2. 일정 내용">
            <TextArea
              value={form.schedule}
              onChange={value => onChange('schedule', value)}
              disabled={disabled}
              placeholder="회의, 보고, 납품, 테스트 일정 내용을 적으세요"
            />
          </Field>
          <Field label="3. 테스트/시식 결과">
            <TextArea
              value={form.tasting}
              onChange={value => onChange('tasting', value)}
              disabled={disabled}
              rows={4}
              placeholder="맛, 식감, 온도, 조리감, 반응을 적으세요"
            />
          </Field>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: 12,
            }}
          >
            <Field label="4. 특이사항">
              <TextArea
                value={form.issue}
                onChange={value => onChange('issue', value)}
                disabled={disabled}
                placeholder="문제, 보완점, 결정사항"
              />
            </Field>
            <Field label="5. 다음 할 일">
              <TextArea
                value={form.next}
                onChange={value => onChange('next', value)}
                disabled={disabled}
                placeholder="내일 이어서 할 일"
              />
            </Field>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button className="btn" onClick={onUseSchedules} disabled={disabled || !daySchedules.length}>
            <Icon.copy style={{ width: 13, height: 13 }} /> 일정 불러오기
          </button>
          <button className="btn primary" onClick={onSave} disabled={disabled}>
            <Icon.check style={{ width: 14, height: 14 }} /> {saving ? '저장 중' : '보고서 저장'}
          </button>
        </div>
        </section>

        <section className="card" style={{ padding: 18 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>
            선택 날짜 일정
          </div>
          <ScheduleList schedules={daySchedules} />
        </section>
      </div>

      <div style={{ marginTop: 14 }}>
        <NotePhotoSection photos={form.photos || []} onChange={value => onChange('photos', value)} />
      </div>
    </>
  );
}
