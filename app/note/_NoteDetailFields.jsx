'use client';
import { TagInput } from '@/components/ui/TagInput';
import { Field } from '@/components/note/FormFields';

export function NoteDetailFields({ form, allTags, updateField }) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 16 }}>
        상세 기록{' '}
        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)' }}>선택</span>
      </div>

      <Field label="사용 재료">
        <textarea
          className="form-input"
          style={{ minHeight: 72, resize: 'vertical' }}
          value={form.materials}
          onChange={event => updateField('materials', event.target.value)}
          placeholder="재료명, 사용량 등"
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="맛 평가">
          <textarea
            className="form-input"
            style={{ minHeight: 80, resize: 'vertical' }}
            value={form.tasteEval}
            onChange={event => updateField('tasteEval', event.target.value)}
            placeholder="맛, 식감, 외관 등"
          />
        </Field>
        <Field label="상무님 평가">
          <textarea
            className="form-input"
            style={{ minHeight: 80, resize: 'vertical' }}
            value={form.managerEval}
            onChange={event => updateField('managerEval', event.target.value)}
            placeholder="평가 내용"
          />
        </Field>
      </div>

      <Field label="원가 검토 메모">
        <input
          className="form-input"
          value={form.costNote}
          onChange={event => updateField('costNote', event.target.value)}
          placeholder="예) 베이컨 40g 변경 시 원가율 +1.2%p"
        />
      </Field>

      <Field label="이슈" hint="발생한 문제·이상 현상 기록">
        <textarea
          className="form-input"
          style={{ minHeight: 72, resize: 'vertical' }}
          value={form.issues}
          onChange={event => updateField('issues', event.target.value)}
          placeholder="예) 반죽 수분 과다로 성형 불가, 굽는 시간 초과 시 탄화 발생 등"
        />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="개선점">
          <textarea
            className="form-input"
            style={{ minHeight: 72, resize: 'vertical' }}
            value={form.improvements}
            onChange={event => updateField('improvements', event.target.value)}
            placeholder="보완할 부분"
          />
        </Field>
        <Field label="다음 액션">
          <textarea
            className="form-input"
            style={{ minHeight: 72, resize: 'vertical' }}
            value={form.nextAction}
            onChange={event => updateField('nextAction', event.target.value)}
            placeholder="재테스트 방향, 일정 등"
          />
        </Field>
      </div>

      <Field label="보고용 요약" hint="직접 입력 또는 우측 자동 생성 복사">
        <textarea
          className="form-input"
          style={{ minHeight: 72, resize: 'vertical' }}
          value={form.reportSummary}
          onChange={event => updateField('reportSummary', event.target.value)}
          placeholder="보고 시 사용할 요약 문구를 입력하세요."
        />
      </Field>

      <Field label="태그" hint="입력 후 Enter 또는 콤마">
        <TagInput value={form.tags} onChange={value => updateField('tags', value)} suggestions={allTags} />
      </Field>
    </div>
  );
}
