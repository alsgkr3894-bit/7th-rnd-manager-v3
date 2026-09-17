/**
 * app/note/journal/_JournalHeaderActions.jsx — 연구일지 헤더 툴바
 *
 * 날짜 이전/다음·조회·빠른 날짜 입력·PDF 출력 범위 선택·종합 PDF 버튼을 묶은
 * PageHeader actions 영역. page.jsx는 상태와 핸들러만 넘긴다.
 */
'use client';
import { Icon } from '@/components/icons';

export function JournalHeaderActions({
  goPrev,
  hasPrev,
  goNext,
  hasNext,
  dateDraft,
  setDateDraft,
  applyDate,
  date,
  quickDateDraft,
  setQuickDateDraft,
  quickDateError,
  setQuickDateError,
  applyQuickDate,
  printMode,
  setPrintMode,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  openJournalPdf,
  printPeriodNotes,
  printRangeTitle,
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
        flex: '1 1 100%',
        minWidth: 0,
        maxWidth: '100%',
      }}
    >
      <button className="btn" onClick={goPrev} disabled={!hasPrev} title="이전 일자">
        <Icon.arrowUp style={{ width: 14, height: 14, transform: 'rotate(-90deg)' }} />
      </button>
      <input
        type="date"
        className="form-input"
        value={dateDraft}
        onChange={e => {
          if (e.target.value) setDateDraft(e.target.value);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            applyDate();
          }
        }}
        style={{
          width: 'min(190px, 100%)',
          flex: '1 1 150px',
          minWidth: 0,
          minHeight: 40,
          fontSize: 16,
          fontWeight: 800,
          padding: '7px 10px',
        }}
      />
      <button
        className={'btn' + (dateDraft !== date ? ' primary' : '')}
        onClick={() => applyDate()}
        disabled={!dateDraft || dateDraft === date}
        title="입력한 날짜로 조회"
      >
        조회
      </button>
      <input
        className="form-input"
        value={quickDateDraft}
        onChange={event => {
          setQuickDateDraft(event.target.value);
          setQuickDateError(false);
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            applyQuickDate();
          }
        }}
        onBlur={() => applyQuickDate()}
        inputMode="numeric"
        placeholder="240502"
        title={quickDateError ? '날짜 확인' : '빠른 날짜 입력'}
        style={{
          width: 94,
          flex: '0 1 94px',
          minWidth: 0,
          minHeight: 40,
          fontSize: 13,
          borderColor: quickDateError ? 'var(--negative)' : undefined,
        }}
      />
      <button className="btn" onClick={goNext} disabled={!hasNext} title="다음 일자">
        <Icon.arrowDown style={{ width: 14, height: 14, transform: 'rotate(-90deg)' }} />
      </button>
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
        <option value="custom">선택기간</option>
      </select>
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
    </div>
  );
}
