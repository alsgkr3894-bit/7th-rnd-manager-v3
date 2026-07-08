import {
  noteDetailPairs,
  noteDisplayTitle,
  noteLegacyMenuName,
  notePrimaryContentLabel,
} from '../../lib/note/display.js';

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
    expect(noteDisplayTitle({ title: '00메리칸 핫도그 스타일' })).toBe('메리칸 핫도그 스타일');
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

  test('sample records use sample form labels instead of menu note labels', () => {
    const sample = {
      id: 'sample:1',
      _recordKind: 'sample',
      testContent: '오븐 조리 조건',
      materials: '치즈바',
      tasteEval: '표면 갈라짐',
      company: '공급사',
      tester: '조홍',
    };

    expect(notePrimaryContentLabel(sample)).toBe('테스트 내용 / 조건');
    expect(noteDetailPairs(sample)).toEqual([
      ['샘플명', '치즈바'],
      ['평가 / 결과', '표면 갈라짐'],
      ['업체명', '공급사'],
      ['담당자', '조홍'],
      ['단가', undefined],
      ['개선사항', undefined],
      ['다음 액션', undefined],
    ]);
  });
});
