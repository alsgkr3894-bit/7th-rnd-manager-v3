import { noteDisplayTitle, noteLegacyMenuName } from '../../lib/note/display.js';

describe('note display helpers', () => {
  test('noteDisplayTitle prefers title and falls back to legacy menuName', () => {
    expect(noteDisplayTitle({ title: '신메뉴 테스트', menuName: '구버전 메뉴' })).toBe(
      '신메뉴 테스트'
    );
    expect(noteDisplayTitle({ title: '', menuName: '구버전 메뉴' })).toBe('구버전 메뉴');
    expect(noteDisplayTitle({ title: 0, menuName: 0 })).toBe('제목 없음');
  });

  test('noteDisplayTitle hides accidental leading zero prefixes before menu text', () => {
    expect(noteDisplayTitle({ title: '0노엣지' })).toBe('노엣지');
    expect(noteDisplayTitle({ title: '00메리칸 핫도그 스타일' })).toBe(
      '메리칸 핫도그 스타일'
    );
    expect(noteDisplayTitle({ title: '0NEW 칠리크림불갈비' })).toBe('NEW 칠리크림불갈비');
    expect(noteDisplayTitle({ title: '\u200B0텍사스 쉬림프' })).toBe('텍사스 쉬림프');
    expect(noteDisplayTitle({ title: '01차 테스트' })).toBe('01차 테스트');
  });

  test('noteLegacyMenuName hides duplicate and zero-like menu names', () => {
    expect(noteLegacyMenuName({ title: '신메뉴 테스트', menuName: '신메뉴 테스트' })).toBe('');
    expect(noteLegacyMenuName({ title: '신메뉴 테스트', menuName: '0' })).toBe('');
    expect(noteLegacyMenuName({ title: '신메뉴 테스트', menuName: '구버전 메뉴' })).toBe(
      '구버전 메뉴'
    );
  });
});
