'use client';
import { TagInput } from '@/components/ui/TagInput';
import { Field } from '@/components/note/FormFields';
import { NOTE_EVALUATION_FIELDS } from '@/lib/note/evaluation';
import { NoteRatingPicker } from '@/app/note/_NoteRatingPicker';

export function NoteEvaluationFields({ form, allTags, updateField }) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 14 }}>
        항목별 평가
        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>
          별점과 태그
        </span>
      </div>

      <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
        {NOTE_EVALUATION_FIELDS.map(item => (
          <NoteRatingPicker
            key={item.key}
            label={item.label}
            value={form[item.key]}
            onChange={value => updateField(item.key, value)}
          />
        ))}
      </div>

      <Field label="태그" hint="Enter 또는 콤마로 추가">
        <TagInput
          value={form.tags}
          onChange={value => updateField('tags', value)}
          suggestions={allTags}
          placeholder="예: 소스개선, 재테스트, 시식완료"
        />
      </Field>
    </div>
  );
}
