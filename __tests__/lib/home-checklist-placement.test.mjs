import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

// 2026-10-19 주임님 지시: 캘린더의 "오늘 하루 체크리스트"는 홈 맨 위 "오늘 할 일" 카드(액션센터)에 붙인다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('홈 오늘 하루 체크리스트 위치', () => {
  test('맨 위 오늘 할 일 카드가 체크리스트를 품고, 경고가 없어도 카드는 사라지지 않는다', () => {
    const card = read('components/home/ActionCenterWidget.jsx');
    expect(card).toContain('<TodayChecklistSection');
    expect(card).not.toContain('if (allItems.length === 0) return null');
    expect(card).toContain('allItems.length > 0 && (');
  });

  test('체크리스트는 캘린더와 같은 훅·저장소를 쓴다(체크하면 연구일지에도 기록)', () => {
    const section = read('components/home/TodayChecklistSection.jsx');
    expect(section).toContain("from '@/app/note/calendar/useTodayChecklist'");
    expect(section).toContain('toggleChecklistItem');
    expect(section).toContain('오늘 하루 체크리스트');
  });

  test('아래 일정 카드(TodoWidget)에는 체크리스트가 중복되지 않는다', () => {
    const todo = read('components/home/TodoWidget.jsx');
    expect(todo).not.toContain('TodayChecklist');
    expect(todo).not.toContain('useTodayChecklist');
    expect(todo).toContain('마감 임박 일정');
  });
});
