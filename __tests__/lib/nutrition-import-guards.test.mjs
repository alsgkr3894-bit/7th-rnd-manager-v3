import {
  buildImportRows,
  parseCrustSuffix,
  toRawValueRecord,
} from '../../lib/nutrition/values/import.js';

describe('nutrition import guards', () => {
  test('parseCrustSuffix는 비문자 입력도 기본 크러스트로 처리', () => {
    expect(parseCrustSuffix(null)).toEqual({
      baseName: '',
      crustType: '석쇠L',
      personal: false,
      skipReason: null,
    });
  });

  test('buildImportRows는 비배열 입력을 빈 결과로 처리', () => {
    expect(buildImportRows({ rawRows: null, menuMasters: null })).toEqual([]);
  });

  test('메뉴마스터 size 접미사를 제거해 베이스 코드로 매칭', () => {
    const rows = buildImportRows({
      rawRows: [{ rawName: '슈퍼콤비네이션 (석쇠 L)', kcal: 250 }],
      menuMasters: [
        { menuCode: 'P-OR-001-L', menuName: '슈퍼콤비네이션', category: '피자/오리지널', size: 'L' },
      ],
      existingKeys: {},
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: 'matched',
      menuCode: 'P-OR-001',
      menuName: '슈퍼콤비네이션',
      crustType: '석쇠L',
      include: true,
    });
  });

  test('toRawValueRecord는 values가 없어도 기본 필드만 반환', () => {
    expect(toRawValueRecord({ menuCode: 'A', menuName: '테스트', crustType: '석쇠L' })).toEqual({
      menuCode: 'A',
      menuName: '테스트',
      crustType: '석쇠L',
    });
  });
});
