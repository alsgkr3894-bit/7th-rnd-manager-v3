import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

// 2026-10-06: 연구일지 화면을 '오늘 내용 보고서'(작성)와 '연구일지 목록' 두 탭으로 나눴다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('연구일지 탭', () => {
  test('작성·목록 두 탭', () => {
    // .jsx는 npm test 변환 대상이 아니라 소스로 확인한다
    const tabs = read('app/note/journal/_JournalTabs.jsx');
    expect(tabs).toContain("{ id: 'write', label: '오늘 내용 보고서' }");
    expect(tabs).toContain("{ id: 'list', label: '연구일지 목록' }");
  });

  test('작성 탭은 보고서 + 그날 기록, 목록 탭은 연구일지 목록', () => {
    const page = read('app/note/journal/page.jsx');
    const writeStart = page.indexOf("tab === 'write' ? (");
    const listStart = page.indexOf('<JournalMonthList', writeStart);
    expect(writeStart).toBeGreaterThan(0);
    const writePart = page.slice(writeStart, listStart);
    expect(writePart).toContain('<JournalEntryEditor');
    expect(writePart).toContain('<JournalDayRecords');
    expect(writePart).not.toContain('<JournalMonthList');
  });

  test('목록에서 날짜를 고르면 작성 탭으로, 확인창 취소면 목록에 남는다', () => {
    const page = read('app/note/journal/page.jsx');
    expect(page).toContain('if (!leave.selectDate(day)) return;');
    expect(page).toContain("setTab('write');");
    const guard = read('app/note/journal/useJournalLeaveGuard.js');
    expect(guard).toContain('if (!confirmLeave()) return false;');
  });

  test('고른 탭은 주소 ?tab=list로 남는다', () => {
    const tabs = read('app/note/journal/_JournalTabs.jsx');
    expect(tabs).toContain("url.searchParams.set('tab', 'list')");
    expect(tabs).toContain("get('tab') === 'list'");
  });

  test('저장 바는 두 탭 모두에서 보인다(탭 조건 밖)', () => {
    const page = read('app/note/journal/page.jsx');
    expect(page.indexOf('<JournalSaveBar')).toBeGreaterThan(page.indexOf('<JournalMonthList'));
    expect(page).toMatch(/\{!showSkeleton && \(\s*<JournalSaveBar/);
  });
});
