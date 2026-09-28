/**
 * app/note/journal/useJournalPrint.js — 연구일지 PDF 출력 범위·생성
 *
 * 헤더 툴바와 하단 저장바가 공유하는 openJournalPdf()를 제공한다.
 */
'use client';
import { useMemo, useState } from 'react';
import { buildJournalPrintHtml } from '@/lib/note/journal-print';
import { openPrintWindow } from '@/lib/print/window-print';
import { todayLocalDate } from '@/lib/date/local-date';
import { isWithinRange, noteDayKey, printRangeForMode, printRangeLabel } from './journalDates';
import { mergeJournalPrintNotesForDate } from './journalForm';
import { withoutJournalSourceDuplicatePhotos } from './journalPhotos';
import { getActiveBrand } from '@/lib/active-brand';

export function useJournalPrint({ journalRecords, date, month, currentJournalPrintNote }) {
  const [printMode, setPrintMode] = useState('day');
  const [customStart, setCustomStart] = useState(() => todayLocalDate());
  const [customEnd, setCustomEnd] = useState(() => todayLocalDate());
  const [printYear, setPrintYear] = useState(() => todayLocalDate().slice(0, 4));

  // 연간에서 고를 수 있는 연도 — 일지가 있는 해 + 올해(기록이 없어도 올해는 고를 수 있게)
  const yearOptions = useMemo(() => {
    const years = new Set([todayLocalDate().slice(0, 4)]);
    for (const note of journalRecords) {
      const key = noteDayKey(note);
      if (/^\d{4}/.test(key)) years.add(key.slice(0, 4));
    }
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [journalRecords]);

  const printRange = useMemo(
    () => printRangeForMode(printMode, { date, month, year: printYear, customStart, customEnd }),
    [printMode, date, month, printYear, customStart, customEnd]
  );
  const printRangeTitle = useMemo(
    () => printRangeLabel(printMode, printRange),
    [printMode, printRange]
  );
  const printPeriodNotes = useMemo(() => {
    const periodNotes = journalRecords
      .filter(note => isWithinRange(noteDayKey(note), printRange))
      .sort(
        (a, b) =>
          noteDayKey(a).localeCompare(noteDayKey(b)) ||
          String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
      );
    const merged =
      currentJournalPrintNote && isWithinRange(date, printRange)
        ? mergeJournalPrintNotesForDate(periodNotes, currentJournalPrintNote, date)
        : periodNotes;
    return withoutJournalSourceDuplicatePhotos(merged);
  }, [journalRecords, printRange, currentJournalPrintNote, date]);

  function openJournalPdf() {
    openPrintWindow(
      buildJournalPrintHtml(printRangeTitle, printPeriodNotes, {
        title: printMode === 'day' ? '오늘 한 일 보고서' : '연구일지 종합본',
        brandName: getActiveBrand()?.name,
        logoSrc:
          typeof window === 'undefined' ? '' : `${window.location.origin}/logo-taemyeong.png`,
      }),
      { width: 800, height: 900 }
    );
  }

  return {
    printMode,
    setPrintMode,
    printYear,
    setPrintYear,
    yearOptions,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    printRangeTitle,
    printPeriodNotes,
    openJournalPdf,
  };
}
