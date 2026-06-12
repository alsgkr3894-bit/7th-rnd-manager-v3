'use client';

import { useMemo } from 'react';
import { pad } from '@/lib/format';
import { sampleNamesText } from '@/lib/sample';
import { WORK_LOG_TYPES } from '@/lib/work-log';
import { daysInMonth, firstDow, groupByDate, isPast, toKey } from './_calendar-utils';
import { expandOccurrences } from './_recurrence';

function buildGridRange(viewYear, viewMonth) {
  const dim = daysInMonth(viewYear, viewMonth);
  const fd = firstDow(viewYear, viewMonth);
  const totalCells = Math.ceil((fd + dim) / 7) * 7;
  const gridStartDt = new Date(viewYear, viewMonth - 1, 1 - fd);
  const gridEndDt = new Date(viewYear, viewMonth - 1, totalCells - fd);
  return {
    dim,
    fd,
    totalCells,
    gridStart: toKey(gridStartDt.getFullYear(), gridStartDt.getMonth() + 1, gridStartDt.getDate()),
    gridEnd: toKey(gridEndDt.getFullYear(), gridEndDt.getMonth() + 1, gridEndDt.getDate()),
  };
}

function buildScheduleDateMap(schedules, gridStart, gridEnd) {
  const map = new Map();
  for (const schedule of schedules) {
    if (!schedule.date) continue;
    const occurrences = expandOccurrences(schedule, gridStart, gridEnd);
    for (const dateStr of occurrences) {
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr).push({
        ...schedule,
        _occurrenceDate: dateStr,
        _isRecurring: schedule.repeatType && schedule.repeatType !== 'none',
      });
    }
  }
  return map;
}

export function useCalendarMonth({
  notes,
  schedules,
  workLogs,
  samples,
  viewYear,
  viewMonth,
  viewMode,
  selectedDay,
  today,
}) {
  const notesByDate = useMemo(
    () => groupByDate(notes, note => note.testDate?.slice(0, 10)),
    [notes]
  );
  const workLogsByDate = useMemo(
    () => groupByDate(workLogs, log => log.date?.slice(0, 10)),
    [workLogs]
  );
  const samplesByDate = useMemo(
    () => groupByDate(samples, sample => sample.testDate?.slice(0, 10)),
    [samples]
  );

  const grid = useMemo(() => buildGridRange(viewYear, viewMonth), [viewYear, viewMonth]);
  const schedulesByDate = useMemo(
    () => buildScheduleDateMap(schedules, grid.gridStart, grid.gridEnd),
    [schedules, grid.gridStart, grid.gridEnd]
  );

  const monthStats = useMemo(() => {
    const prefix = `${viewYear}-${pad(viewMonth)}`;
    let noteDone = 0;
    let noteScheduled = 0;
    let eventTotal = 0;

    for (const [date, monthNotes] of notesByDate) {
      if (!date.startsWith(prefix)) continue;
      if (isPast(date, today)) noteDone += monthNotes.length;
      else noteScheduled += monthNotes.length;
    }

    const seen = new Set();
    for (const [date, monthSchedules] of schedulesByDate) {
      if (!date.startsWith(prefix)) continue;
      for (const schedule of monthSchedules) {
        if (seen.has(schedule.id)) continue;
        seen.add(schedule.id);
        eventTotal++;
      }
    }

    return { noteDone, noteScheduled, eventTotal };
  }, [notesByDate, schedulesByDate, viewMonth, viewYear, today]);

  const cells = useMemo(() => {
    const arr = [];
    for (let i = 0; i < grid.totalCells; i++) {
      const dayNum = i - grid.fd + 1;
      if (dayNum < 1 || dayNum > grid.dim) {
        arr.push(null);
        continue;
      }
      const key = toKey(viewYear, viewMonth, dayNum);
      arr.push({
        dayNum,
        key,
        notes: notesByDate.get(key) || [],
        schedules: schedulesByDate.get(key) || [],
        dow: i % 7,
      });
    }
    return arr;
  }, [viewYear, viewMonth, grid.totalCells, grid.fd, grid.dim, notesByDate, schedulesByDate]);

  const selectedNotes = useMemo(
    () => (selectedDay ? notesByDate.get(selectedDay) || [] : []),
    [selectedDay, notesByDate]
  );
  const selectedSchedules = useMemo(
    () => (selectedDay ? schedulesByDate.get(selectedDay) || [] : []),
    [selectedDay, schedulesByDate]
  );
  const selectedWorkLogs = useMemo(
    () => (selectedDay ? workLogsByDate.get(selectedDay) || [] : []),
    [selectedDay, workLogsByDate]
  );
  const selectedSamples = useMemo(
    () => (selectedDay ? samplesByDate.get(selectedDay) || [] : []),
    [selectedDay, samplesByDate]
  );

  const monthEventRows = useMemo(() => {
    const prefix = `${viewYear}-${pad(viewMonth)}`;
    const rows = [];
    const includeSchedules = viewMode === 'all' || viewMode === 'schedules';
    const includeNotes = viewMode === 'all' || viewMode === 'notes';
    const includeSamples = viewMode === 'all' || viewMode === 'samples';

    if (includeSchedules) {
      for (const [date, items] of schedulesByDate) {
        if (!date.startsWith(prefix)) continue;
        for (const item of items) {
          rows.push([
            date,
            item.time || '',
            '일정',
            item.title || '',
            item.type || '',
            item.memo || item.description || (item._isRecurring ? '반복 일정' : ''),
          ]);
        }
      }
    }

    if (includeNotes) {
      for (const [date, items] of notesByDate) {
        if (!date.startsWith(prefix)) continue;
        for (const item of items) {
          rows.push([
            date,
            '',
            '노트',
            item.menuName || item.title || '',
            item.status || '',
            item.result || item.summary || '',
          ]);
        }
      }
    }

    if (includeSamples) {
      for (const [date, items] of samplesByDate) {
        if (!date.startsWith(prefix)) continue;
        for (const item of items) {
          rows.push([
            date,
            '',
            '샘플',
            sampleNamesText(item) || item.title || '',
            item.company || item.category || '',
            item.result || item.description || '',
          ]);
        }
      }
    }

    if (viewMode === 'all') {
      for (const [date, items] of workLogsByDate) {
        if (!date.startsWith(prefix)) continue;
        for (const item of items) {
          const meta = WORK_LOG_TYPES[item.type] || WORK_LOG_TYPES.OTHER;
          rows.push([
            date,
            item.time ||
              (item.at
                ? new Date(item.at).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''),
            '작업일지',
            meta.label || item.type || '',
            item.type || '',
            item.summary || item.title || item.detail || '',
          ]);
        }
      }
    }

    return rows.sort(
      (a, b) =>
        String(a[0]).localeCompare(String(b[0])) ||
        String(a[1]).localeCompare(String(b[1])) ||
        String(a[2]).localeCompare(String(b[2]), 'ko')
    );
  }, [notesByDate, samplesByDate, schedulesByDate, viewMode, viewMonth, viewYear, workLogsByDate]);

  return {
    notesByDate,
    workLogsByDate,
    samplesByDate,
    schedulesByDate,
    monthStats,
    cells,
    selectedNotes,
    selectedSchedules,
    selectedWorkLogs,
    selectedSamples,
    monthEventRows,
  };
}
