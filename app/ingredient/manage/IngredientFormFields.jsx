'use client';
import { Icon } from '@/components/icons';
import { SEED_HASH_TAGS } from '@/lib/ingredient';
import { SCOPE_ORDER, SCOPE_UNASSIGNED } from '@/lib/ingredient/constants';
import { COST_BASE_UNITS } from '@/lib/cost/unit-policy';
import { Field } from './IngredientFormSections';

const TEMP_OPTIONS = ['냉장', '냉동', '상온', '공산품'];

export function IngredientNameField({ form, errors, isJetteLinked, initial, onSet }) {
  return (
    <Field
      label="재료명"
      required={!isJetteLinked}
      error={errors.ingredientName}
      errorId="ingredientName-error"
      hint={isJetteLinked ? '비워두면 제때 제품명 자동 사용' : undefined}
    >
      <input
        className="form-input"
        value={form.ingredientName}
        aria-describedby={errors.ingredientName ? 'ingredientName-error' : undefined}
        onChange={e => onSet('ingredientName', e.target.value)}
        placeholder={isJetteLinked ? initial?.displayName : '예) 모짜렐라치즈'}
      />
    </Field>
  );
}

export function BasicIngredientFields({
  form,
  errors,
  isJetteLinked,
  catOptions,
  customCat,
  tagInput,
  datalistId,
  onSet,
  onToggleCustomCat,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
}) {
  const tags = form.tags || [];

  return (
    <>
      <Field label="분류" hint="메인 카테고리 1개 (예: 토핑재료, 엣지, 사이드)">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {customCat ? (
            <input
              className="form-input"
              value={form.category}
              onChange={e => onSet('category', e.target.value)}
              placeholder="직접 입력"
              style={{ flex: 1 }}
            />
          ) : (
            <select
              className="form-input"
              value={form.category}
              onChange={e => onSet('category', e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">미분류</option>
              {catOptions.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="btn"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={onToggleCustomCat}
          >
            {customCat ? '목록에서 선택' : '직접 입력'}
          </button>
        </div>
      </Field>

      <Field label="#태그" hint="여러 개 입력 가능 (예: 육가공류, 수산류, 치즈류)">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            alignItems: 'center',
            padding: '6px 8px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            minHeight: 36,
          }}
        >
          {tags.map(t => (
            <span
              key={t}
              style={{
                padding: '3px 6px 3px 10px',
                fontSize: 12,
                fontWeight: 500,
                background: 'var(--surface-2)',
                color: 'var(--text-2)',
                borderRadius: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              #{t}
              <button
                type="button"
                onClick={() => onRemoveTag(t)}
                style={{
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  color: 'inherit',
                  opacity: 0.6,
                }}
              >
                <Icon.close style={{ width: 11, height: 11 }} />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            list={datalistId}
            onChange={e => onTagInputChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                onAddTag(tagInput);
              } else if (e.key === 'Backspace' && !tagInput && tags.length) {
                onRemoveTag(tags[tags.length - 1]);
              }
            }}
            onBlur={() => onAddTag(tagInput)}
            placeholder={tags.length ? '' : '예) 육가공류, 수산류'}
            style={{
              flex: 1,
              minWidth: 120,
              border: 0,
              outline: 0,
              background: 'transparent',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--text-1)',
              padding: '2px 4px',
            }}
          />
          <datalist id={datalistId}>
            {SEED_HASH_TAGS.map(t => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
      </Field>

      <Field label="제조사">
        <input
          className="form-input"
          value={form.manufacturer}
          onChange={e => onSet('manufacturer', e.target.value)}
          placeholder="예) CJ제일제당, 매일유업"
        />
      </Field>

      <Field label="단종 처리" hint="단종 카테고리에만 표시되며, 일반 목록에서 제외됩니다">
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          <input
            type="checkbox"
            checked={!!form.discontinued}
            onChange={e => onSet('discontinued', e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
          />
          단종된 제품으로 표시
        </label>
      </Field>

      {!isJetteLinked && (
        <Field
          label="제때 제품코드"
          hint="입력하면 제때 가격파일과 자동 연동"
          error={errors.productCode}
          errorId="productCode-error"
        >
          <input
            className="form-input"
            value={form.productCode}
            onChange={e => onSet('productCode', e.target.value)}
            placeholder="예) CC310001 (없으면 비워두세요)"
          />
        </Field>
      )}
    </>
  );
}

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
