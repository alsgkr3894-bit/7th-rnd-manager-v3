'use client';
import { OptGroup, Seg, Check } from '@/components/report/ReportBuilderShell';
import { periodCompareLabel } from '@/lib/report/period';
import { asArray } from '@/lib/ui/prop-guards';

const DEFAULT_REPORT_YEAR = 2026;
const DEFAULT_REPORT_MONTH = 1;

/**
 * SalesReportControls
 * Renders the filter/period control panel used inside ReportBuilderShell `options`.
 *
 * Props
 * ─────
 * year, month, quarter, scope, viewMode, periodMode           — current values
 * availYears, availMonthsByYear                              — available data periods
 * onYear, onMonth, onQuarter, onScope, onViewMode, onPeriodMode — setters
 * cmpYear, cmpMonth, cmpQuarter, onCmpYear, onCmpMonth, onCmpQuarter — compare-mode period
 *   (periodMode='quarter'면 month/cmpMonth 자리 대신 quarter/cmpQuarter가 쓰인다.
 *    periodMode='year'면 두 값 모두 무시된다.)
 * opts, upd                                                  — section checkboxes state + updater
 * docFormat, updFmt                                          — document format state + updater
 */
const QUARTERS = [1, 2, 3, 4];

function toPeriodNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function periodList(value, fallback) {
  const list = asArray(value)
    .map(item => toPeriodNumber(item, null))
    .filter(item => item != null);
  return list.length > 0 ? list : [fallback];
}

function periodModeUnitLabel(periodMode) {
  if (periodMode === 'quarter') return '분기';
  if (periodMode === 'year') return '년도';
  return '월';
}

export default function SalesReportControls({
  year,
  month,
  quarter,
  scope,
  viewMode,
  periodMode,
  availYears,
  availMonthsByYear,
  onYear,
  onMonth,
  onQuarter,
  onScope,
  onViewMode,
  onPeriodMode,
  cmpYear,
  cmpMonth,
  cmpQuarter,
  onCmpYear,
  onCmpMonth,
  onCmpQuarter,
  opts,
  upd,
  docFormat,
  updFmt,
}) {
  const safeYear = toPeriodNumber(year, DEFAULT_REPORT_YEAR);
  const safeMonth = toPeriodNumber(month, DEFAULT_REPORT_MONTH);
  const safeQuarter = toPeriodNumber(quarter, 1);
  const safeCmpYear = toPeriodNumber(cmpYear, safeYear);
  const safeCmpMonth = toPeriodNumber(cmpMonth, safeMonth);
  const safeCmpQuarter = toPeriodNumber(cmpQuarter, safeQuarter);
  const safeAvailYears = periodList(availYears, safeYear);
  const safeAvailMonthsByYear =
    availMonthsByYear && typeof availMonthsByYear === 'object' ? availMonthsByYear : {};
  const safeOpts = opts && typeof opts === 'object' ? opts : {};
  const safeDocFormat = docFormat && typeof docFormat === 'object' ? docFormat : {};
  const handleUpd = typeof upd === 'function' ? upd : () => {};
  const handleUpdFmt = typeof updFmt === 'function' ? updFmt : () => {};
  const monthsFor = (targetYear, fallbackMonth) => {
    return periodList(safeAvailMonthsByYear[targetYear], fallbackMonth);
  };
  const unitLabel = periodModeUnitLabel(periodMode);
  const isSameComparePeriod =
    viewMode === 'compare' &&
    safeCmpYear === safeYear &&
    (periodMode === 'year' ||
      (periodMode === 'quarter' && safeCmpQuarter === safeQuarter) ||
      (periodMode === 'month' && safeCmpMonth === safeMonth));

  return (
    <>
      <OptGroup label="보기 모드">
        <Seg
          value={viewMode}
          onChange={onViewMode}
          options={[
            { value: 'rank', label: `해당 ${unitLabel} 순위` },
            { value: 'compare', label: `다른 ${unitLabel} 비교` },
          ]}
        />
      </OptGroup>

      <OptGroup label="집계 기간">
        <Seg
          value={periodMode}
          onChange={onPeriodMode}
          options={[
            { value: 'month', label: '월 단위' },
            { value: 'quarter', label: '분기 단위' },
            { value: 'year', label: '년 단위' },
          ]}
        />
        <div className="opt-period-row">
          <select
            className="period-select num"
            value={safeYear}
            onChange={e => {
              const y = parseInt(e.target.value, 10);
              onYear?.(y);
              if (periodMode === 'month') {
                const ms = monthsFor(y, safeMonth);
                if (ms.length > 0 && !ms.includes(safeMonth)) onMonth?.(ms.at(-1));
              }
            }}
          >
            {safeAvailYears.map(y => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          {periodMode === 'month' && (
            <select
              className="period-select num"
              value={safeMonth}
              onChange={e => onMonth?.(parseInt(e.target.value, 10))}
            >
              {monthsFor(safeYear, safeMonth).map(m => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
          )}
          {periodMode === 'quarter' && (
            <select
              className="period-select num"
              value={safeQuarter}
              onChange={e => onQuarter?.(parseInt(e.target.value, 10))}
            >
              {QUARTERS.map(q => (
                <option key={q} value={q}>
                  {q}분기
                </option>
              ))}
            </select>
          )}
        </div>
        {viewMode === 'compare' && (
          <div style={{ marginTop: 8 }}>
            <div className="opt-label" style={{ fontSize: 11, marginBottom: 4 }}>
              비교 {unitLabel}
            </div>
            <div className="opt-period-row">
              <select
                className="period-select num"
                value={safeCmpYear}
                onChange={e => {
                  const y = parseInt(e.target.value, 10);
                  onCmpYear?.(y);
                  if (periodMode === 'month') {
                    const ms = monthsFor(y, safeCmpMonth);
                    if (ms.length > 0 && !ms.includes(safeCmpMonth)) onCmpMonth?.(ms.at(-1));
                  }
                }}
              >
                {safeAvailYears.map(y => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
              {periodMode === 'month' && (
                <select
                  className="period-select num"
                  value={safeCmpMonth}
                  onChange={e => onCmpMonth?.(parseInt(e.target.value, 10))}
                >
                  {monthsFor(safeCmpYear, safeCmpMonth).map(m => (
                    <option key={m} value={m}>
                      {m}월
                    </option>
                  ))}
                </select>
              )}
              {periodMode === 'quarter' && (
                <select
                  className="period-select num"
                  value={safeCmpQuarter}
                  onChange={e => onCmpQuarter?.(parseInt(e.target.value, 10))}
                >
                  {QUARTERS.map(q => (
                    <option key={q} value={q}>
                      {q}분기
                    </option>
                  ))}
                </select>
              )}
            </div>
            {isSameComparePeriod && (
              <div className="opt-help" role="alert" style={{ color: 'var(--warn)', marginTop: 6 }}>
                기준 {unitLabel}과 비교 {unitLabel}이 같습니다.
              </div>
            )}
          </div>
        )}
      </OptGroup>

      <OptGroup label="대상 범위">
        <select
          className="period-select"
          value={scope}
          onChange={e => onScope?.(e.target.value)}
          style={{ width: '100%' }}
        >
          {[
            { value: 'all', label: '전체' },
            { value: '피자', label: '피자' },
            { value: '1인피자', label: '1인피자' },
            { value: '사이드', label: '사이드' },
            { value: '세트박스', label: '세트박스' },
            { value: '음료', label: '음료' },
            { value: '기타', label: '기타' },
          ].map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </OptGroup>

      <OptGroup label="포함 섹션">
        <Check
          label={`요약 (총 판매량·${periodCompareLabel(periodMode)} 대비)`}
          value={safeOpts.summary}
          onChange={v => handleUpd('summary', v)}
        />
        <Check
          label="카테고리별 판매 비중"
          value={safeOpts.catShare}
          onChange={v => handleUpd('catShare', v)}
        />
        <Check
          label={`피자 ${periodCompareLabel(periodMode)} 대비 상승/하락 TOP 5`}
          value={safeOpts.pizzaMover}
          onChange={v => handleUpd('pizzaMover', v)}
        />
        <Check
          label="메뉴 순위표 (전체)"
          value={safeOpts.rankTable}
          onChange={v => handleUpd('rankTable', v)}
        />
        <Check
          label="카테고리별 비중 그래프"
          value={safeOpts.catBar}
          onChange={v => handleUpd('catBar', v)}
        />
        <Check
          label="규격별 세부 (L/R/기타)"
          value={safeOpts.variant}
          onChange={v => handleUpd('variant', v)}
          hint="순위표 아래 확장"
        />
        <Check
          label="매출액 포함"
          value={safeOpts.revenue}
          onChange={v => handleUpd('revenue', v)}
          hint="미리보기·Excel 출력에 금액 컬럼 표시"
        />
        <Check
          label={`${periodCompareLabel(periodMode)} 대비 증감 컬럼`}
          value={safeOpts.prevComp}
          onChange={v => handleUpd('prevComp', v)}
        />
        <Check
          label="품목 제외 리스트 (마지막 페이지)"
          value={safeOpts.excluded}
          onChange={v => handleUpd('excluded', v)}
        />
      </OptGroup>

      <OptGroup label="문서 형식">
        <Check label="PDF" value={safeDocFormat.pdf} onChange={v => handleUpdFmt('pdf', v)} />
        <Check
          label="Excel (시트별 정리)"
          value={safeDocFormat.excel}
          onChange={v => handleUpdFmt('excel', v)}
        />
      </OptGroup>
    </>
  );
}
