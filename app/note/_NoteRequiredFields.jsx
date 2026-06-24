'use client';
import { SegGroup, Field } from '@/components/note/FormFields';
import { CATEGORIES, NOTE_TYPES, STATUSES, STATUS_COLORS, NOTE_BRANDS } from '@/lib/note';

export function NoteRequiredFields({
  form,
  touched,
  updateTitle,
  updateField,
  markTouched,
  onCategoryChange,
}) {
  const titleValue = form.title || form.menuName || '';

  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 16 }}>
        필수 항목
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        <Field label="제목" error={touched.title && !titleValue.trim()}>
          <input
            className="form-input"
            value={titleValue}
            onChange={event => updateTitle(event.target.value)}
            onBlur={() => markTouched('title')}
            placeholder="예) 횡성한우 와사비마요 조합 테스트"
          />
        </Field>
      </div>

      <Field label="테스트 날짜">
        <input
          className="form-input"
          type="date"
          value={form.testDate}
          onChange={event => updateField('testDate', event.target.value)}
        />
      </Field>

      <Field label="브랜드" hint="이 노트가 속한 브랜드">
        <SegGroup
          options={NOTE_BRANDS.map(brand => brand.name)}
          value={(NOTE_BRANDS.find(brand => brand.id === form.brand) || NOTE_BRANDS[0]).name}
          onChange={name => {
            const found = NOTE_BRANDS.find(brand => brand.name === name);
            updateField('brand', found ? found.id : 'main');
          }}
        />
      </Field>

      <Field label="개발 구분">
        <SegGroup
          options={CATEGORIES}
          value={form.category}
          onChange={value => {
            updateField('category', value);
            onCategoryChange(value);
          }}
        />
      </Field>

      <Field label="유형">
        <SegGroup
          options={NOTE_TYPES}
          value={form.noteType}
          onChange={value => updateField('noteType', value)}
        />
      </Field>

      <Field label="상태">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUSES.map(status => {
            const colors = STATUS_COLORS[status];
            const active = form.status === status;
            return (
              <button
                key={status}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  border: '1px solid',
                  borderColor: active ? colors.color : 'var(--border)',
                  background: active ? colors.bg : 'var(--surface)',
                  color: active ? colors.color : 'var(--text-3)',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: active ? 700 : 400,
                  cursor: 'pointer',
                }}
                onClick={() => updateField('status', status)}
              >
                {status}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label="핵심 테스트 내용"
        required
        error={touched.testContent && !form.testContent.trim()}
      >
        <textarea
          className="form-input"
          style={{ minHeight: 100, resize: 'vertical' }}
          value={form.testContent}
          onChange={event => updateField('testContent', event.target.value)}
          onBlur={() => markTouched('testContent')}
          placeholder="테스트 조건, 온도·시간·재료 비율, 핵심 변경사항 등을 기록하세요."
        />
        {form.testContent && (
          <div className={`char-count${form.testContent.length > 500 ? ' warn' : ''}`}>
            {form.testContent.length}자 ·{' '}
            {form.testContent.trim().split(/\s+/).filter(Boolean).length}단어
          </div>
        )}
      </Field>
    </div>
  );
}
