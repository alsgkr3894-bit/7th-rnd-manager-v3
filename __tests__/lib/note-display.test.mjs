import { noteDisplayTitle, noteLegacyMenuName } from '../../lib/note/display.js';

describe('note display helpers', () => {
  test('noteDisplayTitle prefers title and falls back to legacy menuName', () => {
    expect(noteDisplayTitle({ title: '신메뉴 테스트', menuName: '구버전 메뉴' })).toBe(
      '신메뉴 테스트'
    );
    expect(noteDisplayTitle({ title: '', menuName: '구버전 메뉴' })).toBe('구버전 메뉴');
    expect(noteDisplayTitle({ title: 0, menuName: 0 })).toBe('제목 없음');
  });

  test('noteLegacyMenuName hides duplicate and zero-like menu names', () => {
    expect(noteLegacyMenuName({ title: '신메뉴 테스트', menuName: '신메뉴 테스트' })).toBe('');
    expect(noteLegacyMenuName({ title: '신메뉴 테스트', menuName: '0' })).toBe('');
    expect(noteLegacyMenuName({ title: '신메뉴 테스트', menuName: '구버전 메뉴' })).toBe(
      '구버전 메뉴'
    );
  });
});
