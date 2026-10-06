/**
 * app/note/journal/_JournalPrintControls.jsx — 연구일지 헤더의 PDF 출력 부분
 *
 * 출력 기간(선택일·주간·월간·연간·선택기간)과 종합 PDF 버튼. _JournalHeaderActions.jsx에서 분리.
 */
'use client';
import { Icon } from '@/components/icons';

export function JournalPrintControls({
  printMode,
  setPrintMode,
  printYear,
  setPrintYear,
  yearOptions,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  openJournalPdf,
  printPeriodNotes,
  printRangeTitle,
}) {
  return (
    <>
      <select
        className="form-input"
        value={printMode}
        onChange={event => setPrintMode(event.target.value)}
        style={{ width: 118, minHeight: 40, flex: '0 1 118px' }}
        title="PDF 출력 기간"
      >
        <option value="day">오늘/선택일</option>
        <option value="week">주간</option>
        <option value="month">월간</option>
        <option value="year">연간</option>
        <option value="custom">선택기간</option>
      </select>
      {printMode === 'year' && (
        <select
          className="form-input"
          value={printYear}
          onChange={event => setPrintYear(event.target.value)}
          style={{ width: 110, minHeight: 40, flex: '0 1 110px' }}
          title="PDF 출력 연도"
        >
          {(yearOptions || []).map(year => (
            <option key={year} value={year}>
              {year}년
            </option>
          ))}
        </select>
      )}
      {printMode === 'custom' && (
        <>
          <input
            type="date"
            className="form-input"
            value={customStart}
            onChange={event => event.target.value && setCustomStart(event.target.value)}
            style={{ width: 142, minHeight: 40, flex: '0 1 142px' }}
            title="PDF 시작일"
          />
          <input
            type="date"
            className="form-input"
            value={customEnd}
            onChange={event => event.target.value && setCustomEnd(event.target.value)}
            style={{ width: 142, minHeight: 40, flex: '0 1 142px' }}
            title="PDF 종료일"
          />
        </>
      )}
      <button
        className="btn primary"
        disabled={printPeriodNotes.length === 0}
        onClick={openJournalPdf}
        title={printPeriodNotes.length === 0 ? 'PDF로 출력할 연구일지가 없습니다' : printRangeTitle}
      >
        <Icon.download style={{ width: 14, height: 14 }} /> 종합 PDF
      </button>
    </>
  );
}
