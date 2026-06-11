import { SCHEDULE_COLORS, SCHEDULE_TYPES } from '../../lib/note/schedules.js';

describe('SCHEDULE_TYPES', () => {
  test('일정 추가 모달에 필요한 유형을 포함한다', () => {
    expect(SCHEDULE_TYPES).toEqual(
      expect.arrayContaining(['테스트 예정', '미팅', '보고', '연차', '행사', '프로젝트', '기타'])
    );
  });

  test('모든 일정 유형은 달력 표시 색상을 가진다', () => {
    for (const type of SCHEDULE_TYPES) {
      expect(SCHEDULE_COLORS[type]).toEqual(
        expect.objectContaining({
          bg: expect.any(String),
          text: expect.any(String),
          border: expect.any(String),
        })
      );
    }
  });
});
