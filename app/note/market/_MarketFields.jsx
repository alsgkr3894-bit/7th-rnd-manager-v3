'use client';

import {
  MARKET_BRAND_TYPES,
  MARKET_RESEARCH_REGIONS,
  MARKET_RESEARCH_TYPES,
} from '@/lib/note/market-research';

/** 시장조사 작성 폼·상세 모달이 함께 쓰는 라벨 필드 primitive. */
export function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-3)' }}>{label}</span>
      {children}
    </label>
  );
}

/** 조사 유형(시장분석·올해트렌드 …) 선택 — 작성 모달 맨 위 줄. */
export function TypeRow({ form, update, canEdit }) {
  return (
    <div className="market-type-row">
      {MARKET_RESEARCH_TYPES.map(type => (
        <button
          key={type}
          type="button"
          className={'btn sm' + (form.type === type ? ' primary' : '')}
          onClick={() => update('type', type)}
          disabled={!canEdit}
        >
          {type}
        </button>
      ))}
    </div>
  );
}

/** 브랜드 업종(피자·치킨·기타) 선택 — 이미 고른 버튼을 다시 누르면 선택이 풀린다. */
export function BrandTypeField({ form, update, canEdit }) {
  return (
    <Field label="브랜드 업종">
      <div className="market-region-row" style={{ display: 'flex', gap: 6 }}>
        {MARKET_BRAND_TYPES.map(value => (
          <button
            key={value}
            type="button"
            className={'btn sm' + (form.brandType === value ? ' primary' : '')}
            onClick={() => update('brandType', form.brandType === value ? '' : value)}
            disabled={!canEdit}
          >
            {value}
          </button>
        ))}
      </div>
    </Field>
  );
}

/** 국가 입력 — 한국·미국·일본 등 추천을 고르거나 다른 나라를 직접 입력한다. */
export function CountryField({ form, update, canEdit, options = [] }) {
  return (
    <Field label="국가 (직접 입력 가능)">
      <input
        className="form-input"
        list="market-country-options"
        value={form.country || ''}
        onChange={event => update('country', event.target.value)}
        placeholder="예: 일본, 미국, 한국"
        disabled={!canEdit}
      />
      <datalist id="market-country-options">
        {options.map(option => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </Field>
  );
}

/** 시장 구분(국내/해외) 선택 — 작성 모달에서 쓴다. */
export function RegionField({ form, update, canEdit }) {
  return (
    <Field label="시장 구분">
      <div className="market-region-row" style={{ display: 'flex', gap: 6 }}>
        {MARKET_RESEARCH_REGIONS.map(region => (
          <button
            key={region}
            type="button"
            className={'btn sm' + (form.region === region ? ' primary' : '')}
            onClick={() => update('region', region)}
            disabled={!canEdit}
          >
            {region}
          </button>
        ))}
      </div>
    </Field>
  );
}

export function DetailField({ label, value }) {
  if (!String(value || '').trim()) return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-3)', marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-1)', whiteSpace: 'pre-wrap' }}
      >
        {value}
      </div>
    </div>
  );
}
