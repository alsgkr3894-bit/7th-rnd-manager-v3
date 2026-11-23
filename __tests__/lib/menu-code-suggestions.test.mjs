import { getMenuCodeSegmentSuggestions } from '../../lib/menu-master/code-suggestions.js';

describe('메뉴코드 구간 자동완성', () => {
  const rows = [
    { id: 1, menuCode: 'S-PKL-002' },
    { id: 2, menuCode: 'S-SPG-001' },
    { id: 3, menuCode: 'S-PKL-001' },
    { id: 4, menuCode: 'P-OR-001-L' },
  ];

  test('S- 입력 시 기존 하위 분류를 중복 없이 추천한다', () => {
    expect(getMenuCodeSegmentSuggestions('s-', rows)).toEqual([
      { segment: 'PKL', value: 'S-PKL-' },
      { segment: 'SPG', value: 'S-SPG-' },
    ]);
  });

  test('마지막 번호 구간은 불필요한 하이픈 없이 완성한다', () => {
    expect(getMenuCodeSegmentSuggestions('S-PKL-', rows)).toEqual([
      { segment: '001', value: 'S-PKL-001' },
      { segment: '002', value: 'S-PKL-002' },
    ]);
  });

  test('하이픈으로 끝나지 않은 입력에는 추천을 열지 않는다', () => {
    expect(getMenuCodeSegmentSuggestions('S-P', rows)).toEqual([]);
  });
});
