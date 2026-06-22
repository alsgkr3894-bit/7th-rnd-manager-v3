import { useState } from 'react';
import { Icon } from '@/components/icons';
import { ComboBox } from '@/components/ui/ComboBox';
import { Field, SegGroup } from '@/components/note/FormFields';
import { RATING_COLOR, RATING_LABELS } from '@/lib/sample';
import { clampInteger, noop } from '@/lib/ui/prop-guards';

export function SampleBasicInfoCard({
  form,
  catOptions,
  companyOptions,
  onUpdate,
  onSampleName,
  onAddSampleName,
  onRemoveSampleName,
  readOnly = false,
}) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 16 }}>
        기본 정보
      </div>

      <Field label="제목" required>
        <input
          className="form-input"
          value={form.title}
          onChange={event => onUpdate('title', event.target.value)}
          placeholder="예) ○○ 0차 샘플"
          disabled={readOnly}
        />
      </Field>

      <Field label="샘플명" required hint="여러 개 추가 가능">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(form.sampleNames || ['']).map((name, index) => (
            <div key={index} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                className="form-input"
                value={name}
                onChange={event => onSampleName(index, event.target.value)}
                placeholder="식자재명"
                disabled={readOnly}
              />
              {(form.sampleNames || ['']).length > 1 && (
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '6px 8px', flexShrink: 0 }}
                  onClick={() => onRemoveSampleName(index)}
                  aria-label={`샘플명 ${index + 1} 삭제`}
                  disabled={readOnly}
                >
                  <Icon.close style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="btn sm"
            style={{ alignSelf: 'flex-start' }}
            onClick={onAddSampleName}
            disabled={readOnly}
          >
            <Icon.plus style={{ width: 12, height: 12 }} /> 샘플명 추가
          </button>
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="샘플수령날짜">
          <input
            className="form-input"
            type="date"
            value={form.testDate}
            onChange={event => onUpdate('testDate', event.target.value)}
            disabled={readOnly}
          />
        </Field>
        <Field label="카테고리" hint="입력·선택 모두 가능">
          <ComboBox
            value={form.category}
            onChange={value => onUpdate('category', value)}
            options={catOptions}
            placeholder="예) 피자"
            inputClassName="form-input"
            disabled={readOnly}
          />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="업체명">
          <ComboBox
            value={form.company}
            onChange={value => onUpdate('company', value)}
            options={companyOptions}
            placeholder="예) 대림수산"
            inputClassName="form-input"
            disabled={readOnly}
          />
        </Field>
        <Field label="담당자">
          <input
            className="form-input"
            value={form.tester}
            onChange={event => onUpdate('tester', event.target.value)}
            placeholder="예) 김민지"
            disabled={readOnly}
          />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="평점">
          <StarPicker
            value={form.rating}
            onChange={value => onUpdate('rating', value)}
            disabled={readOnly}
          />
        </Field>
        <Field label="단가">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.price}
                onChange={event => onUpdate('price', event.target.value)}
                placeholder="예) 12000"
                disabled={readOnly}
              />
              <span style={{ fontSize: 13, color: 'var(--text-3)', flexShrink: 0 }}>원</span>
            </div>
            <SegGroup
              options={['부가세포함', '별도']}
              value={form.priceTaxType === 'excl' ? '별도' : '부가세포함'}
              onChange={value => onUpdate('priceTaxType', value === '별도' ? 'excl' : 'incl')}
              disabled={readOnly}
            />
          </div>
        </Field>
      </div>
    </div>
  );
}

function StarPicker({ value, onChange, disabled = false }) {
  const [hovered, setHovered] = useState(0);
  const rating = clampInteger(value, { min: 0, max: 5, fallback: 0 });
  const change = typeof onChange === 'function' ? onChange : noop;

  function handleClick(event, nextRating) {
    if (disabled) return;
    const btn = event.currentTarget;
    btn.classList.remove('star-pop');
    void btn.offsetWidth;
    btn.classList.add('star-pop');
    change(rating === nextRating ? 0 : nextRating);
  }

  const lit = hovered > 0 ? hovered : rating;
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(nextRating => (
        <button
          key={nextRating}
          className={'star-rate-btn' + (nextRating <= lit ? ' lit' : '')}
          type="button"
          disabled={disabled}
          style={{ fontSize: 22, cursor: disabled ? 'not-allowed' : 'pointer' }}
          onClick={event => handleClick(event, nextRating)}
          onMouseEnter={() => {
            if (!disabled) setHovered(nextRating);
          }}
          onMouseLeave={() => setHovered(0)}
        >
          ★
        </button>
      ))}
      {rating > 0 && (
        <span
          style={{
            marginLeft: 6,
            fontSize: 12,
            color: RATING_COLOR[rating] || 'var(--text-2)',
            fontWeight: 600,
          }}
        >
          {RATING_LABELS[rating]}
        </span>
      )}
    </div>
  );
}
