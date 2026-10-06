'use client';
import { useDeferredValue, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { NotePhotoLightbox } from '@/app/note/_NotePhotoLightbox';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { JournalEntryEditor } from './_JournalEntryEditor';
import { JournalMonthList } from './_JournalMonthList';
import { JournalHeaderActions } from './_JournalHeaderActions';
import { JournalDayRecords, JournalLoadingSkeleton } from './_JournalDayRecords';
import { useJournalNavigation } from './useJournalNavigation';
import { adjacentJournalDate } from './journalDates';
import { useJournalData } from './useJournalData';
import { useJournalForm } from './useJournalForm';
import { useJournalPrint } from './useJournalPrint';
import { useJournalLeaveGuard } from './useJournalLeaveGuard';
import { JournalTabs, useJournalTab } from './_JournalTabs';
import { JournalSaveBar } from './_JournalSaveBar';

// ── 메인 페이지 ─────────────────────────────────────────────
export default function Page() {
  const router = useRouter();
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const [search, setSearch] = useState('');
  const [listFilter, setListFilter] = useState('all');
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [tab, setTab] = useJournalTab();

  const nav = useJournalNavigation();
  const { date, month } = nav;

  // 검색 계산은 미뤄 입력이 끊기지 않게 한다(전체 기간 검색은 묶기·필터가 무겁다)
  const deferredSearch = useDeferredValue(search);
  const journal = useJournalData({ date, month, search: deferredSearch, listFilter });
  const { loading, dayNotes, daySchedules, datesWithNotes, monthEntries, filteredMonthEntries } =
    journal;

  const form = useJournalForm({
    date,
    journalEntry: journal.journalEntry,
    dayNotes,
    canEdit,
    daySchedules,
    reloadNotes: journal.reloadNotes,
  });

  const print = useJournalPrint({
    journalRecords: journal.journalRecords,
    date,
    month,
    currentJournalPrintNote: form.currentJournalPrintNote,
  });

  useKeyboardSave(form.saveJournalEntry);
  // 저장 안 한 보고서가 있으면 날짜·화면 이동 전에 묻는다
  const leave = useJournalLeaveGuard(canEdit && form.journalDirty, { nav, router, datesWithNotes });
  // 첫 로드만 스켈레톤 — 저장 후 다시 불러올 때 목록이 사라지며 펼친 줄·스크롤이 풀렸다
  const loadedOnceRef = useRef(false);
  if (!loading) loadedOnceRef.current = true;
  const showSkeleton = loading && !loadedOnceRef.current;
  const hasPrev = adjacentJournalDate(datesWithNotes, date, 'prev') != null;
  const hasNext = adjacentJournalDate(datesWithNotes, date, 'next') != null;

  function scrollToDayRecords() {
    document
      .getElementById('journal-day-records')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // 목록에서 날짜를 고르면 그 날짜 보고서(작성 탭)를 연다 — 확인창에서 취소하면 목록에 남는다
  function openDate(day) {
    if (!leave.selectDate(day)) return;
    setTab('write');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['RND', '연구일지']}
        title="연구일지"
        sub={
          showSkeleton
            ? '로딩 중…'
            : `${nav.dateLabel} · 기록 ${dayNotes.length}건 · 일정 ${daySchedules.length}건`
        }
        actions={
          <JournalHeaderActions
            goPrev={leave.goPrev}
            hasPrev={hasPrev}
            goNext={leave.goNext}
            hasNext={hasNext}
            dateDraft={nav.dateDraft}
            setDateDraft={nav.setDateDraft}
            applyDate={leave.applyDate}
            date={date}
            quickDateDraft={nav.quickDateDraft}
            setQuickDateDraft={nav.setQuickDateDraft}
            quickDateError={nav.quickDateError}
            setQuickDateError={nav.setQuickDateError}
            applyQuickDate={leave.applyQuickDate}
            printMode={print.printMode}
            setPrintMode={print.setPrintMode}
            printYear={print.printYear}
            setPrintYear={print.setPrintYear}
            yearOptions={print.yearOptions}
            customStart={print.customStart}
            setCustomStart={print.setCustomStart}
            customEnd={print.customEnd}
            setCustomEnd={print.setCustomEnd}
            openJournalPdf={print.openJournalPdf}
            printPeriodNotes={print.printPeriodNotes}
            printRangeTitle={print.printRangeTitle}
          />
        }
      />

      <JournalTabs tab={tab} onTab={setTab} listCount={monthEntries.length} />

      {showSkeleton ? (
        <JournalLoadingSkeleton />
      ) : tab === 'write' ? (
        <>
          <JournalEntryEditor
            dateLabel={nav.dateLabel}
            form={form.journalForm}
            onChange={form.updateJournalForm}
            onUseSchedules={form.useSchedulesInJournal}
            onScrollToRecords={scrollToDayRecords}
            saving={form.saving}
            canEdit={canEdit}
            existingEntry={journal.journalEntry}
            dirty={form.journalDirty}
            daySchedules={daySchedules}
          />
          <JournalDayRecords
            date={date}
            dayNotes={dayNotes}
            onPhotoClick={setPreviewPhoto}
            router={leave.guardedRouter}
            onEditJournal={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          />
        </>
      ) : (
        <JournalMonthList
          month={month}
          entries={filteredMonthEntries}
          totalEntries={monthEntries.length}
          selectedDate={date}
          onMonthChange={nav.setMonth}
          onSelectDate={openDate}
          search={search}
          onSearch={setSearch}
          listFilter={listFilter}
          onListFilter={setListFilter}
          searchScope={journal.searchScope}
          onPhotoClick={setPreviewPhoto}
        />
      )}

      {!showSkeleton && (
        <JournalSaveBar
          form={form}
          canEdit={canEdit}
          journalEntry={journal.journalEntry}
          dateLabel={nav.dateLabel}
          print={print}
        />
      )}

      {previewPhoto && (
        <NotePhotoLightbox
          photo={previewPhoto}
          title={previewPhoto.caption || previewPhoto.name || '사진 보기'}
          onClose={() => setPreviewPhoto(null)}
        />
      )}
    </main>
  );
}
