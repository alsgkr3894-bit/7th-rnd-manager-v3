'use client';
import { SCOPE_ORDER, SCOPE_UNASSIGNED } from '@/lib/ingredient/constants';
import { COST_BASE_UNITS } from '@/lib/cost/unit-policy';
import { Field } from './IngredientFormSections';

const TEMP_OPTIONS = ['냉장', '냉동', '상온', '공산품'];

export function IngredientCostFields({ form, errors, isJetteLinked, onSet }) {
  return (
    <>
      <Field
        label="포장수량"
        hint={
          isJetteLinked
            ? '향후 원가표 연동 시 자동 입력 (현재는 수동)'
            : 'g·개당 단가 자동 계산에 사용'
        }
        error={errors.baseQuantity}
        errorId="baseQuantity-error"
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            type="number"
            min="0"
            value={form.baseQuantity}
            aria-describedby={errors.baseQuantity ? 'baseQuantity-error' : undefined}
            onChange={e => onSet('baseQuantity', e.target.value)}
            placeholder="예) 1000"
            style={{ flex: 1 }}
          />
          <select
            className="form-input"
            value={form.baseUnitType}
            onChange={e => onSet('baseUnitType', e.target.value)}
            style={{ width: 80 }}
          >
            {COST_BASE_UNITS.map(u => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </Field>

      {!isJetteLinked && (
        <>
          <Field label="보관 온도">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                <input
                  type="radio"
                  value=""
                  checked={form.temperature === ''}
                  onChange={() => onSet('temperature', '')}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span style={{ color: 'var(--text-3)' }}>미지정</span>
              </label>
              {TEMP_OPTIONS.map(t => (
                <label
                  key={t}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  <input
                    type="radio"
                    value={t}
                    checked={form.temperature === t}
                    onChange={() => onSet('temperature', t)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  {t}
                </label>
              ))}
            </div>
          </Field>

          <Field label="과세구분">
            <div style={{ display: 'flex', gap: 12 }}>
              {['과세', '면세'].map(t => (
                <label
                  key={t}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  <input
                    type="radio"
                    value={t}
                    checked={form.taxType === t}
                    onChange={() => onSet('taxType', t)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  {t}
                </label>
              ))}
            </div>
          </Field>

          <Field
            label="수동 단가 (부가세포함)"
            hint="제때 연동 없을 때 사용"
            error={errors.priceOverride}
            errorId="priceOverride-error"
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.priceOverride}
                aria-describedby={errors.priceOverride ? 'priceOverride-error' : undefined}
                onChange={e => onSet('priceOverride', e.target.value)}
                placeholder="예) 7680"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>원</span>
            </div>
          </Field>
        </>
      )}

      <Field
        label="전용/범용"
        hint={
          isJetteLinked
            ? '제때 관리품목 분류로 저장됩니다 (가격비교와 공유)'
            : '제때 연동 없는 항목은 직접 지정 (미지정 시 이슈에 표시)'
        }
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            <input
              type="radio"
              name="scope"
              value=""
              checked={form.scope === ''}
              onChange={() => onSet('scope', '')}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span style={{ color: 'var(--text-3)' }}>{SCOPE_UNASSIGNED}</span>
          </label>
          {SCOPE_ORDER.map(s => (
            <label
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              <input
                type="radio"
                name="scope"
                value={s}
                checked={form.scope === s}
                onChange={() => onSet('scope', s)}
                style={{ accentColor: 'var(--accent)' }}
              />
              {s}
            </label>
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
