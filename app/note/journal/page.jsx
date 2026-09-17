'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { StickySaveBar } from '@/components/ui/StickySaveBar';
import { Icon } from '@/components/icons';
import { useKeyboardSave } from '@/hooks/useKeyboardSave';
import { NotePhotoLightbox } from '@/app/note/_NotePhotoLightbox';
import { useCurrentRole } from '@/hooks/useCurrentRole';
import { JournalEntryEditor } from './_JournalEntryEditor';
import { JournalMonthList } from './_JournalMonthList';
import { JournalHeaderActions } from './_JournalHeaderActions';
import { JournalDayRecords, JournalLoadingSkeleton } from './_JournalDayRecords';
import { useJournalNavigation } from './useJournalNavigation';
import { useJournalData } from './useJournalData';
import { useJournalForm } from './useJournalForm';
import { useJournalPrint } from './useJournalPrint';

// ── 메인 페이지 ─────────────────────────────────────────────
export default function Page() {
  const router = useRouter();
  const { isAdmin, ready: roleReady } = useCurrentRole();
  const canEdit = roleReady && isAdmin;
  const [search, setSearch] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const nav = useJournalNavigation();
  const { date, month } = nav;

  const journal = useJournalData({ date, month, search });
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

  function goPrev() {
    nav.goToAdjacentDate(datesWithNotes, 'prev');
  }
  function goNext() {
    nav.goToAdjacentDate(datesWithNotes, 'next');
  }
  const hasPrev = datesWithNotes.indexOf(date) < datesWithNotes.length - 1;
  const hasNext = datesWithNotes.indexOf(date) > 0;

  function scrollToDayRecords() {
    document
      .getElementById('journal-day-records')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['RND', '연구일지']}
        title="연구일지"
        sub={
          loading
            ? '로딩 중…'
            : `${nav.dateLabel} · 기록 ${dayNotes.length}건 · 일정 ${daySchedules.length}건`
        }
        actions={
          <JournalHeaderActions
            goPrev={goPrev}
            hasPrev={hasPrev}
            goNext={goNext}
            hasNext={hasNext}
            dateDraft={nav.dateDraft}
            setDateDraft={nav.setDateDraft}
            applyDate={nav.applyDate}
            date={date}
            quickDateDraft={nav.quickDateDraft}
            setQuickDateDraft={nav.setQuickDateDraft}
            quickDateError={nav.quickDateError}
            setQuickDateError={nav.setQuickDateError}
            applyQuickDate={nav.applyQuickDate}
            printMode={print.printMode}
            setPrintMode={print.setPrintMode}
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

      {loading ? (
        <JournalLoadingSkeleton />
      ) : (
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

          <JournalMonthList
            month={month}
            entries={filteredMonthEntries}
            totalEntries={monthEntries.length}
            selectedDate={date}
            onMonthChange={nav.setMonth}
            onSelectDate={nav.setDate}
            search={search}
            onSearch={setSearch}
          />

          <JournalDayRecords
            date={date}
            dayNotes={dayNotes}
            onPhotoClick={setPreviewPhoto}
            router={router}
          />
        </>
      )}

      {!loading && (
        <StickySaveBar
          onCancel={form.revertJournalForm}
          onSave={form.saveJournalEntry}
          saving={form.saving}
          canSave={canEdit && (form.journalDirty || !journal.journalEntry)}
          cancelLabel="되돌리기"
          saveLabel="보고서 저장"
          savingLabel="저장 중"
          status={
            !canEdit
              ? '관리자만 저장할 수 있습니다'
              : form.journalDirty
                ? `${nav.dateLabel} · 저장 안 된 변경사항`
                : journal.journalEntry
                  ? `${nav.dateLabel} · 저장됨`
                  : `${nav.dateLabel} · 새 일지`
          }
          extra={
            <button
              type="button"
              className="btn"
              onClick={print.openJournalPdf}
              disabled={print.printPeriodNotes.length === 0}
              title={
                print.printPeriodNotes.length === 0
                  ? 'PDF로 출력할 연구일지가 없습니다'
                  : print.printRangeTitle
              }
            >
              <Icon.download style={{ width: 13, height: 13 }} /> PDF
            </button>
          }
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
