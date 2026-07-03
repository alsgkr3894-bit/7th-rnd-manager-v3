import {
  buildImportRows,
  normalizeImportMatchKey,
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

  test('가져오기 매칭 키는 NEW, 앞자리 0, 피자/사이즈 접미사를 제거한다', () => {
    expect(normalizeImportMatchKey('0NEW 샘스테이크 피자 L')).toBe(
      normalizeImportMatchKey('샘스테이크')
    );
    expect(normalizeImportMatchKey('흥부박포테이토피자')).toBe(
      normalizeImportMatchKey('흥부박포테이토')
    );
  });

  test('메뉴마스터 size 접미사를 제거해 베이스 코드로 매칭', () => {
    const rows = buildImportRows({
      rawRows: [{ rawName: '슈퍼콤비네이션 (석쇠 L)', kcal: 250 }],
      menuMasters: [
        {
          menuCode: 'P-OR-001-L',
          menuName: '슈퍼콤비네이션',
          category: '피자/오리지널',
          size: 'L',
        },
      ],
      existingKeys: {},
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: 'matched',
      menuCode: 'P-OR-001',
      menuName: '슈퍼콤비네이션',
      category: '피자',
      crustType: '석쇠L',
      include: true,
    });
  });

  test('1인용 피자 가져오기는 카테고리를 피자로 저장하되 personal 플래그를 유지', () => {
    const rows = buildImportRows({
      rawRows: [{ rawName: '더블치즈 (1인용)', kcal: 250 }],
      menuMasters: [
        {
          menuCode: 'P-ONE-001',
          menuName: '더블치즈 (1인용)',
          category: '1인피자',
        },
      ],
      existingKeys: {},
    });

    expect(rows[0]).toMatchObject({
      status: 'matched',
      menuCode: 'P-ONE-001',
      menuName: '더블치즈 (1인용)',
      category: '피자',
      crustType: '씬바사삭L',
      personal: true,
      include: true,
    });
  });

  test('연구기관 파일의 축약 제품명도 메뉴마스터 피자명에 매칭한다', () => {
    const rows = buildImportRows({
      rawRows: [
        { rawName: '샘스테이크 (석쇠L)', kcal: 277.3 },
        { rawName: '흥부박포테이토피자 (씬바샤삭 L)', kcal: 216.34 },
      ],
      menuMasters: [
        {
          menuCode: 'P-PS-001-L',
          menuName: '0NEW 샘스테이크 피자 L',
          category: '피자/프리미엄스페셜',
          size: 'L',
        },
        {
          menuCode: 'P-OR-088-L',
          menuName: '흥부박포테이토 피자',
          category: '피자/오리지널',
          size: 'L',
        },
      ],
      existingKeys: {},
    });

    expect(rows.map(row => row.status)).toEqual(['matched', 'matched']);
    expect(rows.map(row => row.menuCode)).toEqual(['P-PS-001', 'P-OR-088']);
    expect(rows.map(row => row.crustType)).toEqual(['석쇠L', '씬바사삭L']);
  });

  test('엑셀 코드가 있으면 이름보다 메뉴코드 매칭을 우선한다', () => {
    const rows = buildImportRows({
      rawRows: [{ rawName: '다른 이름 (석쇠 L)', rawCode: 'P-PS-777-L', kcal: 250 }],
      menuMasters: [
        {
          menuCode: 'P-PS-777-L',
          menuName: '코드 우선 피자',
          category: '피자/프리미엄',
          size: 'L',
        },
      ],
      existingKeys: {},
    });

    expect(rows[0]).toMatchObject({
      status: 'matched',
      matchSource: 'code',
      menuCode: 'P-PS-777',
      menuName: '코드 우선 피자',
    });
  });

  test('저장된 수동 매칭 alias를 다음 가져오기에서 재사용한다', () => {
    const rows = buildImportRows({
      rawRows: [{ rawName: '기관표기 메뉴 (석쇠 L)', kcal: 250 }],
      menuMasters: [
        {
          menuCode: 'P-OR-555-L',
          menuName: '실제 메뉴 피자',
          category: '피자/오리지널',
          size: 'L',
        },
      ],
      aliasMap: {
        [normalizeImportMatchKey('기관표기 메뉴')]: {
          menuCode: 'P-OR-555',
          menuName: '실제 메뉴 피자',
          category: '피자',
        },
      },
      existingKeys: {},
    });

    expect(rows[0]).toMatchObject({
      status: 'matched',
      matchSource: 'saved',
      menuCode: 'P-OR-555',
    });
  });

  test('피자가 아닌 시트 가져오기는 석쇠가 아니라 단품 슬롯으로 저장한다', () => {
    const rows = buildImportRows({
      rawRows: [{ rawName: '핫윙 (4pcs)', sheetType: 'side', kcal: 250 }],
      menuMasters: [
        {
          menuCode: 'S-WING-001',
          menuName: '핫윙 (4pcs)',
          category: '사이드',
        },
      ],
      existingKeys: {},
    });

    expect(rows[0]).toMatchObject({
      status: 'matched',
      menuCode: 'S-WING-001',
      menuName: '핫윙 (4pcs)',
      category: '사이드',
      crustType: '단품',
      basis: 'serving',
      include: true,
    });
  });

  test('기존 석쇠L 비피자 영양값은 단품 슬롯의 기존 값으로 감지한다', () => {
    const rows = buildImportRows({
      rawRows: [{ rawName: '치즈볼', sheetType: 'side', kcal: 120 }],
      menuMasters: [{ menuCode: 'S-CHZ-001', menuName: '치즈볼', category: '사이드' }],
      existingKeys: { 'S-CHZ-001__석쇠L': true },
    });

    expect(rows[0]).toMatchObject({
      status: 'exists',
      crustType: '단품',
      basis: 'serving',
    });
  });

  test('미사용 씬 도우 R 표기는 건너뛴다', () => {
    expect(parseCrustSuffix('슈퍼콤비네이션 (씬바샤삭 R)')).toEqual({
      baseName: '슈퍼콤비네이션',
      crustType: null,
      personal: false,
      skipReason: '미사용 크러스트',
    });
    expect(parseCrustSuffix('슈퍼콤비네이션 씬바샤삭 R')).toMatchObject({
      baseName: '슈퍼콤비네이션',
      crustType: null,
      skipReason: '미사용 크러스트',
    });
  });

  test('toRawValueRecord는 values가 없어도 기본 필드만 반환', () => {
    expect(toRawValueRecord({ menuCode: 'A', menuName: '테스트', crustType: '석쇠L' })).toEqual({
      menuCode: 'A',
      menuName: '테스트',
      crustType: '석쇠L',
    });
  });

  test('toRawValueRecord는 세부 카테고리를 네 가지 영양 카테고리로 정규화', () => {
    expect(
      toRawValueRecord({
        menuCode: 'A',
        menuName: '테스트',
        crustType: '석쇠L',
        category: '피자/프리미엄',
      }).category
    ).toBe('피자');
  });
});
