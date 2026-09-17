import { describe, expect, test } from '@jest/globals';
import {
  EDGE_FAMILIES,
  getEdgeFamily,
  resolveMenuEdgeFamily,
} from '../../lib/menu-master/edge-family.js';
import {
  ALLERGEN_CRUST_VARIANTS,
  EDGE_CODES,
  CRUST_TYPES,
} from '../../lib/nutrition/crust-config.js';

describe('EDGE_FAMILIES — 엣지 3종(메뉴마스터·엣지관리·영양) 단일 출처', () => {
  test('ALLERGEN_CRUST_VARIANTS와 순서·costEdgeType이 그대로 일치한다 (4번째 복사본 방지)', () => {
    expect(EDGE_FAMILIES.map(f => f.key)).toEqual(ALLERGEN_CRUST_VARIANTS.map(v => v.key));
    expect(EDGE_FAMILIES.map(f => f.costEdgeType)).toEqual(
      ALLERGEN_CRUST_VARIANTS.map(v => v.edgeType)
    );
  });

  test('치즈크러스트·골드스윗만 nutrition_edge_master 코드를 갖는다', () => {
    expect(getEdgeFamily('치즈크러스트').nutritionEdgeCodes).toEqual([
      '치즈크러스트L',
      '치즈크러스트R',
    ]);
    expect(getEdgeFamily('골드스윗').nutritionEdgeCodes).toEqual(['골드스윗L', '골드스윗R']);
    expect(getEdgeFamily('석쇠').nutritionEdgeCodes).toEqual([]);
    expect(getEdgeFamily('씬바사삭').nutritionEdgeCodes).toEqual([]);
    // EDGE_CODES를 전부 소진했는지 — 새 엣지 코드가 추가되면 이 테스트가 실패해 갱신을 강제한다.
    const covered = [
      ...getEdgeFamily('치즈크러스트').nutritionEdgeCodes,
      ...getEdgeFamily('골드스윗').nutritionEdgeCodes,
    ];
    expect(covered.sort()).toEqual([...EDGE_CODES].sort());
  });

  test('석쇠·씬바사삭만 nutrition_raw_values의 베이스 crustType을 갖는다', () => {
    expect(getEdgeFamily('석쇠').baseCrustTypes).toEqual(['석쇠L', '석쇠R']);
    expect(getEdgeFamily('씬바사삭').baseCrustTypes).toEqual(['씬바사삭L']);
    expect(getEdgeFamily('치즈크러스트').baseCrustTypes).toEqual([]);
    expect(getEdgeFamily('골드스윗').baseCrustTypes).toEqual([]);
    // 1인용피자(CRUST_TYPES의 나머지 1개)는 어느 엣지 패밀리에도 속하지 않아야 한다.
    const covered = new Set([
      ...getEdgeFamily('석쇠').baseCrustTypes,
      ...getEdgeFamily('씬바사삭').baseCrustTypes,
    ]);
    expect(CRUST_TYPES.filter(c => !covered.has(c))).toEqual(['1인용피자']);
  });

  test('getEdgeFamily는 없는 키에 null을 반환한다', () => {
    expect(getEdgeFamily('없는키')).toBeNull();
  });
});

describe('resolveMenuEdgeFamily — 메뉴마스터/판매가 엣지 행 → 패밀리 판정', () => {
  test('category가 엣지가 아니면 null', () => {
    expect(resolveMenuEdgeFamily({ category: '피자', menuName: '골드스윗' })).toBeNull();
    expect(resolveMenuEdgeFamily(null)).toBeNull();
  });

  test('edgeKey가 명시돼 있으면 이름과 무관하게 그 패밀리를 우선한다', () => {
    const family = resolveMenuEdgeFamily({
      category: '엣지',
      menuName: '아무이름',
      edgeKey: '골드스윗',
    });
    expect(family?.key).toBe('골드스윗');
  });

  test('edgeKey가 없으면 실데이터 이름(공백·접미 표기 차이)에서 자동 판정한다', () => {
    expect(resolveMenuEdgeFamily({ category: '엣지', menuName: '석쇠' })?.key).toBe('석쇠');
    expect(resolveMenuEdgeFamily({ category: '엣지', menuName: '석쇠도우' })?.key).toBe('석쇠');
    expect(resolveMenuEdgeFamily({ category: '엣지', menuName: '치즈크러스트' })?.key).toBe(
      '치즈크러스트'
    );
    // 실데이터: menu_master '골드스윗' vs cost edgeType '골드스윗크러스트' — 이름이 완전히
    // 같지 않아도 부분일치로 잡혀야 오늘 발견한 원가마진표 버그가 재발하지 않는다.
    expect(resolveMenuEdgeFamily({ category: '엣지', menuName: '골드스윗' })?.key).toBe('골드스윗');
    expect(resolveMenuEdgeFamily({ category: '엣지', menuName: '골드스윗 크러스트' })?.key).toBe(
      '골드스윗'
    );
    // 실데이터: menu_master '씬바사삭' vs cost edgeType '씬도우'.
    expect(resolveMenuEdgeFamily({ category: '엣지', menuName: '씬바사삭' })?.key).toBe('씬바사삭');
  });

  test('알 수 없는 이름은 null', () => {
    expect(resolveMenuEdgeFamily({ category: '엣지', menuName: '알수없는엣지' })).toBeNull();
  });
});
