import { TagInput } from '@/components/ui/TagInput';
import { Field } from '@/components/note/FormFields';

export function SampleDetailRecordCard({ form, allTags, onUpdate }) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 16 }}>
        상세 기록{' '}
        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)' }}>선택</span>
      </div>

      <Field label="테스트 내용 / 조건">
        <textarea
          className="form-input"
          style={{ minHeight: 96, resize: 'vertical' }}
          value={form.description}
          onChange={event => onUpdate('description', event.target.value)}
          placeholder="재료 비율, 조리 시간, 온도, 변경 사항 등"
        />
      </Field>

      <Field label="평가 / 결과">
        <textarea
          className="form-input"
          style={{ minHeight: 80, resize: 'vertical' }}
          value={form.result}
          onChange={event => onUpdate('result', event.target.value)}
          placeholder="맛, 식감, 외관, 고객 반응 등"
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="개선사항">
          <textarea
            className="form-input"
            style={{ minHeight: 72, resize: 'vertical' }}
            value={form.improvements}
            onChange={event => onUpdate('improvements', event.target.value)}
            placeholder="보완할 부분"
          />
        </Field>
        <Field label="다음 액션">
          <textarea
            className="form-input"
            style={{ minHeight: 72, resize: 'vertical' }}
            value={form.nextAction}
            onChange={event => onUpdate('nextAction', event.target.value)}
            placeholder="재테스트 방향, 일정 등"
          />
        </Field>
      </div>

      <Field label="태그" hint="입력 후 Enter 또는 콤마">
        <TagInput
          value={form.tags}
          onChange={value => onUpdate('tags', value)}
          suggestions={allTags}
        />
      </Field>
    </div>
  );
}
