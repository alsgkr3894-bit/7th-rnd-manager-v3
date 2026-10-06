/**
 * app/note/journal/_JournalHeaderActions.jsx — 연구일지 헤더 툴바
 *
 * PageHeader actions 영역. 날짜 이동(_JournalDateNav)과 PDF 출력(_JournalPrintControls)을
 * 한 줄에 묶는다. page.jsx는 상태와 핸들러만 넘긴다.
 */
'use client';
import { JournalDateNav } from './_JournalDateNav';
import { JournalPrintControls } from './_JournalPrintControls';

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
      <JournalDateNav
        goPrev={goPrev}
        hasPrev={hasPrev}
        goNext={goNext}
        hasNext={hasNext}
        dateDraft={dateDraft}
        setDateDraft={setDateDraft}
        applyDate={applyDate}
        date={date}
        quickDateDraft={quickDateDraft}
        setQuickDateDraft={setQuickDateDraft}
        quickDateError={quickDateError}
        setQuickDateError={setQuickDateError}
        applyQuickDate={applyQuickDate}
      />
      <JournalPrintControls
        printMode={printMode}
        setPrintMode={setPrintMode}
        printYear={printYear}
        setPrintYear={setPrintYear}
        yearOptions={yearOptions}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
        openJournalPdf={openJournalPdf}
        printPeriodNotes={printPeriodNotes}
        printRangeTitle={printRangeTitle}
      />
    </div>
  );
}
