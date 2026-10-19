'use client';

import { MARKET_BRAND_TYPES, MARKET_RESEARCH_REGIONS } from '@/lib/note/market-research';
import { REGION_FILTER_ALL, REGION_FILTER_NONE } from './marketUtils';

const ROW_STYLE = { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' };

function ChipRow({ options, value, counts, onChange }) {
  return (
    <div className="market-region-row" style={ROW_STYLE}>
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          className={'chip' + (value === optionValue ? ' active' : '')}
          onClick={() => onChange?.(optionValue)}
        >
          {label} {counts[optionValue] ?? 0}
        </button>
      ))}
    </div>
  );
}

const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));

/** 시장조사 목록 위 필터 — 연·월, 국내/해외 칩, 피자·치킨 등 브랜드 업종 칩, 국가 선택. */
export function MarketFilters({ filters }) {
  const {
    year = '',
    setYear,
    month = '',
    setMonth,
    yearOptions = [],
    monthCounts = {},
    region = REGION_FILTER_ALL,
    setRegion,
    regionCounts = {},
    brandType = '',
    setBrandType,
    brandTypeCounts = {},
    country = '',
    setCountry,
    usedCountries = [],
  } = filters || {};
  const regionOptions = [
    [REGION_FILTER_ALL, '전체'],
    ...MARKET_RESEARCH_REGIONS.map(value => [value, value]),
    ...((regionCounts[REGION_FILTER_NONE] || 0) > 0 ? [[REGION_FILTER_NONE, '미분류']] : []),
  ];
  const brandTypeOptions = [['', '모든 업종'], ...MARKET_BRAND_TYPES.map(value => [value, value])];
  return (
    <>
      {yearOptions.length > 0 && (
        <div style={{ ...ROW_STYLE, alignItems: 'center' }}>
          <select
            className="form-input"
            value={year}
            onChange={event => {
              setYear?.(event.target.value);
              setMonth?.('');
            }}
            aria-label="연도별 보기"
            style={{ width: 'auto' }}
          >
            <option value="">전체 기간</option>
            {yearOptions.map(item => (
              <option key={item.year} value={item.year}>
                {item.year}년 ({item.count})
              </option>
            ))}
          </select>
          <select
            className="form-input"
            value={month}
            onChange={event => setMonth?.(event.target.value)}
            disabled={!year}
            aria-label="월별 보기"
            style={{ width: 'auto' }}
          >
            <option value="">전체 월</option>
            {MONTHS.map(value => (
              <option key={value} value={value}>
                {Number(value)}월{monthCounts[value] ? ` (${monthCounts[value]})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
      <ChipRow options={regionOptions} value={region} counts={regionCounts} onChange={setRegion} />
      <ChipRow
        options={brandTypeOptions}
        value={brandType}
        counts={brandTypeCounts}
        onChange={setBrandType}
      />
      {usedCountries.length > 0 && (
        <select
          className="form-input"
          value={country}
          onChange={event => setCountry?.(event.target.value)}
          aria-label="국가별 보기"
          style={{ marginBottom: 10 }}
        >
          <option value="">모든 국가</option>
          {usedCountries.map(item => (
            <option key={item.country} value={item.country}>
              {item.country} ({item.count})
            </option>
          ))}
        </select>
      )}
    </>
  );
}
