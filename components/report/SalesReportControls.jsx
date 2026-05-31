'use client';
import { OptGroup, Seg, Check } from '@/components/report/ReportBuilderShell';

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
export default function SalesReportControls({
  year, month, scope, viewMode, periodMode,
  availYears, availMonthsByYear,
  onYear, onMonth, onScope, onViewMode, onPeriodMode,
  cmpYear, cmpMonth, onCmpYear, onCmpMonth,
  opts, upd,
  docFormat, updFmt,
}) {
  return (
    <>
      <OptGroup label="보기 모드">
        <Seg value={viewMode} onChange={onViewMode}
          options={[{value:'rank',label:'해당 월 순위'},{value:'compare',label:'다른 월 비교'}]}/>
      </OptGroup>

      <OptGroup label="집계 기간">
        <Seg value={periodMode} onChange={onPeriodMode}
          options={[{value:'month',label:'월 단위'},{value:'year',label:'년 단위'}]}/>
        <div className="opt-period-row">
          <select className="period-select num" value={year} onChange={e => {
            const y = parseInt(e.target.value);
            onYear(y);
            const ms = availMonthsByYear[y] || [];
            if (ms.length > 0 && !ms.includes(month)) onMonth(ms.at(-1));
          }}>
            {(availYears.length > 0 ? availYears : [year]).map(y =>
              <option key={y} value={y}>{y}년</option>)}
          </select>
          {periodMode === 'month' && (
            <select className="period-select num" value={month} onChange={e => onMonth(parseInt(e.target.value))}>
              {(availMonthsByYear[year]?.length > 0 ? availMonthsByYear[year] : [month]).map(m =>
                <option key={m} value={m}>{m}월</option>)}
            </select>
          )}
        </div>
        {viewMode === 'compare' && (
          <div style={{marginTop:8}}>
            <div className="opt-label" style={{fontSize:11,marginBottom:4}}>비교 월</div>
            <div className="opt-period-row">
              <select className="period-select num" value={cmpYear ?? year} onChange={e => {
                const y = parseInt(e.target.value);
                onCmpYear(y);
                const ms = availMonthsByYear[y] || [];
                if (ms.length > 0 && !ms.includes(cmpMonth)) onCmpMonth(ms.at(-1));
              }}>
                {(availYears.length > 0 ? availYears : [year]).map(y =>
                  <option key={y} value={y}>{y}년</option>)}
              </select>
              <select className="period-select num" value={cmpMonth ?? month} onChange={e => onCmpMonth(parseInt(e.target.value))}>
                {(availMonthsByYear[cmpYear ?? year]?.length > 0
                  ? availMonthsByYear[cmpYear ?? year]
                  : [cmpMonth ?? month]
                ).map(m => <option key={m} value={m}>{m}월</option>)}
              </select>
            </div>
          </div>
        )}
      </OptGroup>

      <OptGroup label="대상 범위">
        <Seg value={scope} onChange={onScope}
          options={[{value:'all',label:'전체'},{value:'pizza',label:'피자'},{value:'side',label:'사이드'}]}/>
      </OptGroup>

      <OptGroup label="포함 섹션">
        <Check label="요약 (총 판매량·전월 대비)"      value={opts.summary}    onChange={v=>upd('summary',v)}/>
        <Check label="카테고리별 판매 비중"             value={opts.catShare}   onChange={v=>upd('catShare',v)}/>
        <Check label="피자 전월 대비 상승/하락 TOP 5"   value={opts.pizzaMover} onChange={v=>upd('pizzaMover',v)}/>
        <Check label="메뉴 순위표 (전체)"               value={opts.rankTable}  onChange={v=>upd('rankTable',v)}/>
        <Check label="카테고리별 비중 그래프"            value={opts.catBar}    onChange={v=>upd('catBar',v)}/>
        <Check label="규격별 세부 (L/R/기타)"           value={opts.variant}   onChange={v=>upd('variant',v)} hint="순위표 아래 확장"/>
        <Check label="전월 대비 증감 컬럼"              value={opts.prevComp}  onChange={v=>upd('prevComp',v)}/>
        <Check label="품목 제외 리스트 (마지막 페이지)"  value={opts.excluded}  onChange={v=>upd('excluded',v)}/>
      </OptGroup>

      <OptGroup label="문서 형식">
        <Check label="PDF"                value={docFormat.pdf}   onChange={v=>updFmt('pdf',v)}/>
        <Check label="Excel (시트별 정리)" value={docFormat.excel} onChange={v=>updFmt('excel',v)}/>
      </OptGroup>
    </>
  );
}
