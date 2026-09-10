import { describe, expect, test } from '@jest/globals';
import {
  buildDiscontinuedBaseCodeSet,
  buildNutritionMenuMasterDiagnostics,
  isNutritionMenuDiscontinued,
} from '../../lib/nutrition/menu-master-diagnostics.js';

describe('nutrition menu master diagnostics', () => {
  test('메뉴마스터에 없는 nutrition_menu_ref를 진단한다', () => {
    const diagnostics = buildNutritionMenuMasterDiagnostics({
      menuRefs: [
        { id: 1, menuCode: 'PZ-001', menuName: '등록 피자' },
        { id: 2, menuCode: 'MENU-OLD', menuName: '구형 영양 메뉴' },
        { id: 3, menuCode: '', menuName: '코드 없는 행' },
      ],
      menuMasters: [{ id: 10, menuCode: 'PZ-001', menuName: '등록 피자' }],
    });

    expect(diagnostics).toEqual({
      hasOrphans: true,
      orphanCount: 1,
      orphanMenuRefs: [{ id: 2, menuCode: 'MENU-OLD', menuName: '구형 영양 메뉴' }],
    });
  });

  test('모든 영양 메뉴가 메뉴마스터에 있으면 orphan 진단이 없다', () => {
    expect(
      buildNutritionMenuMasterDiagnostics({
        menuRefs: [{ id: 1, menuCode: 'PZ-001', menuName: '등록 피자' }],
        menuMasters: [{ id: 10, menuCode: 'PZ-001', menuName: '등록 피자' }],
      })
    ).toEqual({
      hasOrphans: false,
      orphanCount: 0,
      orphanMenuRefs: [],
    });
  });

  test('메뉴마스터 size 칼럼이 비어있거나 코드 끝과 달라도 코드 문자열만으로 매칭한다 (회귀)', () => {
    // 원인이었던 버그: getMenuCodeBase()가 size 칼럼 값에 의존해 사이즈 접미사를
    // 벗겨냈다. size가 비어있거나('' / null / '라지' 같은 다른 표기) 코드 끝
    // ('-L'/'-R')과 정확히 일치하지 않으면 base 코드를 못 만들어 정상 메뉴를
    // "메뉴마스터에 없음"으로 오탐했다 — 그 오탐 화면의 "누락 메뉴 정리" 버튼은
    // 실제로 존재하는 영양성분 원본값까지 삭제하므로 데이터 손실로 이어졌다.
    expect(
      buildNutritionMenuMasterDiagnostics({
        menuRefs: [{ id: 1, menuCode: 'P-PS-001', menuName: '샘스테이크 피자' }],
        menuMasters: [
          { id: 10, menuCode: 'P-PS-001-L', menuName: '샘스테이크 피자', size: '' },
          { id: 11, menuCode: 'P-PS-001-R', menuName: '샘스테이크 피자', size: null },
        ],
      })
    ).toEqual({
      hasOrphans: false,
      orphanCount: 0,
      orphanMenuRefs: [],
    });
  });

  test('영양 메뉴의 베이스 코드가 메뉴마스터 L/R 사이즈 코드와 연결되면 orphan으로 보지 않는다', () => {
    expect(
      buildNutritionMenuMasterDiagnostics({
        menuRefs: [{ id: 1, menuCode: 'P-PS-001', menuName: '샘스테이크 피자 L' }],
        menuMasters: [
          {
            id: 10,
            menuCode: 'P-PS-001-L',
            menuName: '샘스테이크 피자',
            category: '피자',
            size: 'L',
          },
          {
            id: 11,
            menuCode: 'P-PS-001-R',
            menuName: '샘스테이크 피자',
            category: '피자',
            size: 'R',
          },
        ],
      })
    ).toEqual({
      hasOrphans: false,
      orphanCount: 0,
      orphanMenuRefs: [],
    });
  });
});

describe('buildDiscontinuedBaseCodeSet / isNutritionMenuDiscontinued', () => {
  test('연결된 사이즈 행이 전부 단종일 때만 base 코드를 숨김 대상에 넣는다', () => {
    const set = buildDiscontinuedBaseCodeSet([
      { menuCode: 'P-PS-001-L', status: 'discontinued' },
      { menuCode: 'P-PS-001-R', status: 'discontinued' },
      { menuCode: 'P-PS-002-L', status: 'discontinued' },
      { menuCode: 'P-PS-002-R', status: 'active' }, // R은 판매 중
    ]);
    expect(isNutritionMenuDiscontinued('P-PS-001', set)).toBe(true);
    // 하나라도 판매 중이면(P-PS-002-R) 숨기지 않는다(사용자 결정)
    expect(isNutritionMenuDiscontinued('P-PS-002', set)).toBe(false);
  });

  test('판매 중인 메뉴는 숨김 대상이 아니다', () => {
    const set = buildDiscontinuedBaseCodeSet([{ menuCode: 'P-PS-003-L', status: 'active' }]);
    expect(isNutritionMenuDiscontinued('P-PS-003', set)).toBe(false);
  });

  test('빈 집합이면 항상 false를 반환한다(오탐 방지)', () => {
    expect(isNutritionMenuDiscontinued('아무거나', new Set())).toBe(false);
    expect(buildDiscontinuedBaseCodeSet([]).size).toBe(0);
    expect(buildDiscontinuedBaseCodeSet(null).size).toBe(0);
  });
});
