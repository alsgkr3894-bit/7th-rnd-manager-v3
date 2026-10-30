'use client';

import { BrandTypeField, CountryField, Field, RegionField } from './_MarketFields';

export function MarketBasics({ form, update, canEdit, brandOptions, countryOptions }) {
  return (
    <div className="market-basics">
      <Field label="제목">
        <input
          className="form-input market-title-input"
          value={form.title}
          onChange={event => update('title', event.target.value)}
          placeholder="조사 내용을 한눈에 알아볼 제목"
          disabled={!canEdit}
          autoFocus
        />
      </Field>
      <div className="market-form-row market-form-row-two">
        <RegionField form={form} update={update} canEdit={canEdit} />
        <CountryField form={form} update={update} canEdit={canEdit} options={countryOptions} />
      </div>
      <div className="market-form-row market-form-row-two">
        <Field label="조사 날짜">
          <input
            className="form-input"
            type="date"
            value={form.date}
            onChange={event => update('date', event.target.value)}
            disabled={!canEdit}
          />
        </Field>
        <Field label="출시 날짜">
          <input
            className="form-input"
            type="date"
            value={form.releaseDate || ''}
            onChange={event => update('releaseDate', event.target.value)}
            disabled={!canEdit}
            aria-describedby="market-release-hint"
          />
        </Field>
      </div>
      <p className="market-form-hint" id="market-release-hint">
        출시 날짜를 비워두면 조사 날짜로 저장합니다.
      </p>
      <Field label="브랜드">
        <input
          className="form-input"
          list="market-brand-options"
          value={form.brand}
          onChange={event => update('brand', event.target.value)}
          placeholder="브랜드 이름 또는 조사 대상"
          disabled={!canEdit}
        />
        <datalist id="market-brand-options">
          {brandOptions.map(option => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </Field>
      <BrandTypeField form={form} update={update} canEdit={canEdit} />
    </div>
  );
}
