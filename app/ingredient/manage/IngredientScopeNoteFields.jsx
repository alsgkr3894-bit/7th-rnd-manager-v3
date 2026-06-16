'use client';
import { SCOPE_ORDER, SCOPE_UNASSIGNED } from '@/lib/ingredient/constants';
import { Field } from './IngredientFieldPrimitives';
import { IngredientRadioOption } from './IngredientRadioOption';

export function IngredientScopeNoteFields({ form, isJetteLinked, onSet }) {
  return (
    <>
      <Field
        label="전용/범용"
        hint={
          isJetteLinked
            ? '제때 관리품목 분류로 저장됩니다 (가격비교와 공유)'
            : '제때 연동 없는 항목은 직접 지정 (미지정 시 이슈에 표시)'
        }
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <IngredientRadioOption
            name="scope"
            value=""
            checked={form.scope === ''}
            onChange={() => onSet('scope', '')}
            muted
          >
            {SCOPE_UNASSIGNED}
          </IngredientRadioOption>
          {SCOPE_ORDER.map(scope => (
            <IngredientRadioOption
              key={scope}
              name="scope"
              value={scope}
              checked={form.scope === scope}
              onChange={() => onSet('scope', scope)}
            >
              {scope}
            </IngredientRadioOption>
          ))}
        </div>
      </Field>

      <Field label="비고">
        <input
          className="form-input"
          value={form.note}
          onChange={e => onSet('note', e.target.value)}
          placeholder="예) 냉장 보관 / 수입산"
        />
      </Field>
    </>
  );
}
