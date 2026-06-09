'use client';
import { OptGroup, Seg, Check } from '@/components/report/ReportBuilderShell';
import { asArray } from '@/lib/ui/prop-guards';

/**
 * SalesReportControls
 * Renders the filter/period control panel used inside ReportBuilderShell `options`.
 *
 * Props
 * ─────
 * year, month, scope, viewMode, periodMode          — current values
 * availYears, availMonthsByYear                     — available data periods
 * onYear, onMonth, onScope, onViewMode, onPeriodMode — setters
 * cmpYear, cmpMonth, onCmpYear, onCmpMonth          — compare-mode period
 * opts, upd                                         — section checkboxes state + updater
 * docFormat, updFmt                                 — document format state + updater
 */
const _now = new Date();
const _tm = { year: _now.getFullYear(), month: _now.getMonth() + 1 };
const _lm = {
  year: _now.getMonth() === 0 ? _now.getFullYear() - 1 : _now.getFullYear(),
  month: _now.getMonth() === 0 ? 12 : _now.getMonth(),
};

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

export default function SalesReportControls({
  year,
  month,
  scope,
  viewMode,
  periodMode,
  availYears,
  availMonthsByYear,
  onYear,
  onMonth,
  onScope,
  onViewMode,
  onPeriodMode,
  cmpYear,
  cmpMonth,
  onCmpYear,
  onCmpMonth,
  opts,
  upd,
  docFormat,
  updFmt,
}) {
  const safeYear = toPeriodNumber(year, _tm.year);
  const safeMonth = toPeriodNumber(month, _tm.month);
  const safeCmpYear = toPeriodNumber(cmpYear, safeYear);
  const safeCmpMonth = toPeriodNumber(cmpMonth, safeMonth);
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
  const hasMonth = (targetYear, targetMonth) => monthsFor(targetYear, null).includes(targetMonth);

  return (
    <>
      <OptGroup label="보기 모드">
        <Seg
          value={viewMode}
          onChange={onViewMode}
          options={[
            { value: 'rank', label: '해당 월 순위' },
            { value: 'compare', label: '다른 월 비교' },
          ]}
        />
      </OptGroup>

      <OptGroup label="집계 기간">
        <Seg
          value={periodMode}
          onChange={onPeriodMode}
          options={[
            { value: 'month', label: '월 단위' },
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
              const ms = monthsFor(y, safeMonth);
              if (ms.length > 0 && !ms.includes(safeMonth)) onMonth?.(ms.at(-1));
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
        </div>
        {periodMode === 'month' && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button
              className="btn sm"
              disabled={!hasMonth(_lm.year, _lm.month)}
              onClick={() => {
                onYear?.(_lm.year);
                onMonth?.(_lm.month);
              }}
            >
              지난달
            </button>
            <button
              className="btn sm"
              disabled={!hasMonth(_tm.year, _tm.month)}
              onClick={() => {
                onYear?.(_tm.year);
                onMonth?.(_tm.month);
              }}
            >
              이번달
            </button>
          </div>
        )}
        {viewMode === 'compare' && (
          <div style={{ marginTop: 8 }}>
            <div className="opt-label" style={{ fontSize: 11, marginBottom: 4 }}>
              비교 월
            </div>
            <div className="opt-period-row">
              <select
                className="period-select num"
                value={safeCmpYear}
                onChange={e => {
                  const y = parseInt(e.target.value, 10);
                  onCmpYear?.(y);
                  const ms = monthsFor(y, safeCmpMonth);
                  if (ms.length > 0 && !ms.includes(safeCmpMonth)) onCmpMonth?.(ms.at(-1));
                }}
              >
                {safeAvailYears.map(y => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
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
            </div>
          </div>
        )}
      </OptGroup>

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
          label="요약 (총 판매량·전월 대비)"
          value={safeOpts.summary}
          onChange={v => handleUpd('summary', v)}
        />
        <Check
          label="카테고리별 판매 비중"
          value={safeOpts.catShare}
          onChange={v => handleUpd('catShare', v)}
        />
        <Check
          label="피자 전월 대비 상승/하락 TOP 5"
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
          label="전월 대비 증감 컬럼"
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
