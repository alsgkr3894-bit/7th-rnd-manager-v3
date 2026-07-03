import { describe, expect, test } from '@jest/globals';
import { buildNutritionMenuMasterDiagnostics } from '../../lib/nutrition/menu-master-diagnostics.js';

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
