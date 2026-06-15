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
});
