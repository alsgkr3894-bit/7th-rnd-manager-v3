import { Check, OptGroup, Seg } from '@/components/report/ReportBuilderShell';

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function YearSelect({ value, years, onChange }) {
  return (
    <select
      className="period-select num"
      value={value}
      onChange={event => onChange(event.target.value)}
    >
      {years.map(year => (
        <option key={year} value={year}>
          {year}년
        </option>
      ))}
    </select>
  );
}

function MonthSelect({ value, onChange }) {
  return (
    <select
      className="period-select num"
      value={value}
      onChange={event => onChange(event.target.value)}
    >
      {MONTHS.map(month => (
        <option key={month} value={month}>
          {month}월
        </option>
      ))}
    </select>
  );
}

export function MenuSalesCompareOptions({
  mode,
  onMode,
  scope,
  onScope,
  yearA,
  monthA,
  yearB,
  monthB,
  onYearA,
  onMonthA,
  onYearB,
  onMonthB,
  availableYears,
  opts,
  onOptionChange,
}) {
  return (
    <>
      <OptGroup label="비교 모드">
        <Seg
          value={mode}
          onChange={onMode}
          options={[
            { value: 'mom', label: '전월 대비' },
            { value: 'yoy', label: '전년 동월' },
            { value: 'custom', label: '사용자 지정' },
          ]}
        />
      </OptGroup>

      <OptGroup label="기간 A (기준)">
        <div className="opt-period-row">
          <YearSelect value={yearA} years={availableYears} onChange={onYearA} />
          <MonthSelect value={monthA} onChange={onMonthA} />
        </div>
      </OptGroup>

      {mode === 'custom' && (
        <OptGroup label="기간 B (비교)">
          <div className="opt-period-row">
            <YearSelect value={yearB} years={availableYears} onChange={onYearB} />
            <MonthSelect value={monthB} onChange={onMonthB} />
          </div>
        </OptGroup>
      )}

      <OptGroup label="대상 범위">
        <Seg
          value={scope}
          onChange={onScope}
          options={[
            { value: 'all', label: '전체' },
            { value: 'pizza', label: '피자' },
            { value: 'side', label: '사이드' },
          ]}
        />
      </OptGroup>

      <OptGroup label="포함 섹션">
        <Check
          label="요약 (총 판매량·증감)"
          value={!!opts.summary}
          onChange={value => onOptionChange('summary', value)}
        />
        <Check
          label="카테고리별 비교"
          value={!!opts.catCompare}
          onChange={value => onOptionChange('catCompare', value)}
        />
        <Check
          label="순위 이동표 (메뉴별 A→B)"
          value={!!opts.rankShift}
          onChange={value => onOptionChange('rankShift', value)}
        />
        <Check
          label="비교 차트 (스택 막대)"
          value={!!opts.chart}
          onChange={value => onOptionChange('chart', value)}
        />
        <Check
          label="Winners & Losers 부록"
          value={!!opts.winners}
          onChange={value => onOptionChange('winners', value)}
          hint="±10% 이상 변동"
        />
      </OptGroup>
    </>
  );
}
