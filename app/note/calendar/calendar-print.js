import { withDownloadDateSuffix } from '@/lib/download';
import { pad } from '@/lib/format';
import { noteDisplayTitle } from '@/lib/note/display';
import { buildAutoPrintScript, openPrintWindow } from '@/lib/print/window-print';

export function escapeCalendarPrintValue(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 노트 '내용' 칸 — 노트에는 result/summary가 없고 testContent(없으면 다음 액션)가 본문이다. */
export function calendarNoteContent(note) {
  return String(note?.testContent || note?.nextAction || note?.result || note?.summary || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function viewIncludes(viewMode, kind) {
  const mode = viewMode || 'all';
  if (mode === 'all') return true;
  return mode === kind;
}

export function buildCalendarMonthEventDates({
  viewYear,
  viewMonth,
  notesByDate,
  schedulesByDate,
  samplesByDate,
  workLogsByDate,
  viewMode = 'all',
}) {
  const prefix = `${viewYear}-${pad(viewMonth)}`;
  const dateSet = new Set([
    ...(viewIncludes(viewMode, 'notes') ? Array.from((notesByDate || new Map()).keys()) : []),
    ...(viewIncludes(viewMode, 'schedules')
      ? Array.from((schedulesByDate || new Map()).keys())
      : []),
    ...(viewIncludes(viewMode, 'samples') ? Array.from((samplesByDate || new Map()).keys()) : []),
    ...((viewMode || 'all') === 'all' ? Array.from((workLogsByDate || new Map()).keys()) : []),
  ]);
  return [...dateSet].filter(date => date.startsWith(prefix)).sort();
}

function buildCalendarScheduleRow(schedule) {
  return `<tr><td class="type sched">일정</td><td>${escapeCalendarPrintValue(
    schedule.time || '—'
  )}</td><td>${escapeCalendarPrintValue(schedule.title)}</td><td>${escapeCalendarPrintValue(
    schedule.type || ''
  )}</td><td>${escapeCalendarPrintValue(schedule.memo || schedule.description || '')}</td></tr>`;
}

function buildCalendarNoteRow(note) {
  return `<tr><td class="type note">노트</td><td>—</td><td>${escapeCalendarPrintValue(
    noteDisplayTitle(note, '')
  )}</td><td>${escapeCalendarPrintValue(note.status || '')}</td><td>${escapeCalendarPrintValue(
    calendarNoteContent(note)
  )}</td></tr>`;
}

function buildCalendarSampleRow(sample) {
  const names = Array.isArray(sample.sampleNames) ? sample.sampleNames.join(', ') : '';
  const title = names || sample.menuName || sample.title || '';
  return `<tr><td class="type sample">샘플</td><td>—</td><td>${escapeCalendarPrintValue(
    title
  )}</td><td>${escapeCalendarPrintValue(
    sample.company || sample.category || ''
  )}</td><td>${escapeCalendarPrintValue(
    String(sample.result || sample.description || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120)
  )}</td></tr>`;
}

function buildCalendarWorkLogRow(log) {
  return `<tr><td class="type log">작업일지</td><td>${escapeCalendarPrintValue(
    log.time || '—'
  )}</td><td>${escapeCalendarPrintValue(log.title || log.type || '')}</td><td>${escapeCalendarPrintValue(
    log.type || ''
  )}</td><td>${escapeCalendarPrintValue(log.summary || log.detail || '')}</td></tr>`;
}

export function buildCalendarMonthDaySection({
  date,
  viewMonth,
  schedules = [],
  notes = [],
  samples = [],
  workLogs = [],
  viewMode = 'all',
}) {
  const [, , day] = date.split('-');
  const rows = [
    ...(viewIncludes(viewMode, 'schedules') ? schedules.map(buildCalendarScheduleRow) : []),
    ...(viewIncludes(viewMode, 'notes') ? notes.map(buildCalendarNoteRow) : []),
    ...(viewIncludes(viewMode, 'samples') ? samples.map(buildCalendarSampleRow) : []),
    ...((viewMode || 'all') === 'all' ? workLogs.map(buildCalendarWorkLogRow) : []),
  ].join('');
  if (!rows) return '';
  return `<section class="day"><div class="day-head">${viewMonth}/${day}</div><table><thead><tr><th style="width:48px">구분</th><th style="width:50px">시간</th><th>제목</th><th style="width:72px">상태</th><th>내용</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

export function buildCalendarMonthRowsHtml({
  viewYear,
  viewMonth,
  notesByDate,
  schedulesByDate,
  samplesByDate,
  workLogsByDate,
  viewMode = 'all',
}) {
  return buildCalendarMonthEventDates({
    viewYear,
    viewMonth,
    notesByDate,
    schedulesByDate,
    samplesByDate,
    workLogsByDate,
    viewMode,
  })
    .map(date =>
      buildCalendarMonthDaySection({
        date,
        viewMonth,
        schedules: schedulesByDate?.get(date) || [],
        notes: notesByDate?.get(date) || [],
        samples: samplesByDate?.get(date) || [],
        workLogs: workLogsByDate?.get(date) || [],
        viewMode,
      })
    )
    .filter(Boolean)
    .join('');
}

export function buildCalendarMonthPrintHtml({
  viewYear,
  viewMonth,
  notesByDate,
  schedulesByDate,
  samplesByDate,
  workLogsByDate,
  viewMode = 'all',
  title = withDownloadDateSuffix(`${viewYear}년 ${viewMonth}월 달력`),
} = {}) {
  const body = buildCalendarMonthRowsHtml({
    viewYear,
    viewMonth,
    notesByDate,
    schedulesByDate,
    samplesByDate,
    workLogsByDate,
    viewMode,
  });
  const safeTitle = escapeCalendarPrintValue(title);

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${safeTitle}</title><style>
*{box-sizing:border-box;}body{margin:0;padding:14mm 16mm;font-family:Pretendard,-apple-system,sans-serif;font-size:10pt;color:#111;background:#fff;}
@page{size:A4 portrait;margin:14mm 16mm;}
h1{font-size:18pt;font-weight:900;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:16px;}
.day{margin-bottom:14px;break-inside:avoid;}
.day-head{font-size:12pt;font-weight:800;margin-bottom:4px;color:#111;}
table{width:100%;border-collapse:collapse;font-size:9pt;}
th,td{border:1px solid #ddd;padding:4px 6px;vertical-align:top;}
th{background:#f5f5f5;font-weight:800;text-align:center;}
.type{font-weight:700;text-align:center;white-space:nowrap;}
.type.sched{color:#0369A1;}.type.note{color:#7C3AED;}.type.sample{color:#047857;}.type.log{color:#B45309;}
</style></head><body><h1>${safeTitle}</h1>${body || '<p style="color:#999">이번 달 항목이 없습니다</p>'}${buildAutoPrintScript()}</body></html>`;
}

export function printCalendarMonth(options) {
  return openPrintWindow(buildCalendarMonthPrintHtml(options), { width: 900, height: 700 });
}
