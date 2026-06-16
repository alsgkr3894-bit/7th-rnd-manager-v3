import { readFileSync } from 'fs';
import { resolve } from 'path';

const panelSource = readFileSync(resolve('app/note/calendar/_DayPanel.jsx'), 'utf8');
const headerSource = readFileSync(resolve('app/note/calendar/_DayPanelHeader.jsx'), 'utf8');
const scheduleSource = readFileSync(resolve('app/note/calendar/_DayScheduleSection.jsx'), 'utf8');
const noteSource = readFileSync(resolve('app/note/calendar/_DayNoteSection.jsx'), 'utf8');
const sampleSource = readFileSync(resolve('app/note/calendar/_DaySampleSection.jsx'), 'utf8');
const workLogSource = readFileSync(resolve('app/note/calendar/_DayWorkLogSection.jsx'), 'utf8');

describe('note calendar day panel structure', () => {
  test('DayPanel keeps data safety and delegates visible sections', () => {
    expect(panelSource).toContain('export function DayPanel');
    expect(panelSource).toContain('asObjectArray(notes)');
    expect(panelSource).toContain('<DayPanelHeader');
    expect(panelSource).toContain('<DayScheduleSection');
    expect(panelSource).toContain('<DayNoteSection');
    expect(panelSource).toContain('<DaySampleSection');
    expect(panelSource).toContain('<DayWorkLogSection');
    expect(panelSource).not.toContain('STATUS_COLORS');
    expect(panelSource).not.toContain('SCHEDULE_COLORS');
    expect(panelSource).not.toContain('WORK_LOG_TYPES');
    expect(panelSource).not.toContain('sampleNamesText');
  });

  test('day panel section responsibilities remain separated', () => {
    expect(headerSource).toContain('export function DayPanelHeader');
    expect(headerSource).toContain('WEEKDAYS');
    expect(headerSource).toContain('isToday');
    expect(scheduleSource).toContain('export function DayScheduleSection');
    expect(scheduleSource).toContain('function ScheduleItem');
    expect(scheduleSource).toContain('SCHEDULE_COLORS');
    expect(noteSource).toContain('export function DayNoteSection');
    expect(noteSource).toContain('function NoteItem');
    expect(noteSource).toContain('STATUS_COLORS');
    expect(sampleSource).toContain('export function DaySampleSection');
    expect(sampleSource).toContain('sampleNamesText');
    expect(sampleSource).toContain('RATING_COLOR');
    expect(workLogSource).toContain('export function DayWorkLogSection');
    expect(workLogSource).toContain('WORK_LOG_TYPES');
    expect(workLogSource).toContain('자동 일지');
  });
});
