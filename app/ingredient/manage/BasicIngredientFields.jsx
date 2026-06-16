'use client';
import { Icon } from '@/components/icons';
import { SEED_HASH_TAGS } from '@/lib/ingredient';
import { Field } from './IngredientFieldPrimitives';

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
