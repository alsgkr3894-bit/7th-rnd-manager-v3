import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
  buildMasterByCode,
  isPersonalPizzaMenu,
  resolveNutritionGroup,
} from '../../lib/nutrition/menu-group.js';

describe('buildMasterByCode — 영양 메뉴(베이스 코드)에서 메뉴마스터(full 코드) 조회', () => {
  const masters = [
    { menuCode: 'P-OR-006-L', menuName: '페페로니 피자 L', category: '피자/오리지널' },
    { menuCode: 'P-OR-006-R', menuName: '페페로니 피자 R', category: '피자/오리지널' },
    { menuCode: 'P-ONE-002', menuName: '페페로니 피자', category: '1인피자' },
    { menuCode: 'D-CC-001-355', menuName: '코카콜라355ml', category: '음료' },
  ];

  test('full 코드와 베이스 코드 모두로 조회된다', () => {
    const map = buildMasterByCode(masters);
    expect(map['P-OR-006-L'].menuName).toBe('페페로니 피자 L');
    expect(map['P-OR-006'].category).toBe('피자/오리지널');
    expect(map['P-ONE-002'].category).toBe('1인피자');
    expect(map['D-CC-001-355'].category).toBe('음료');
  });

  test('베이스 코드 키는 full 코드 행을 덮어쓰지 않는다', () => {
    const map = buildMasterByCode([
      { menuCode: 'X-1', menuName: '베이스 자체', category: '사이드' },
      { menuCode: 'X-1-L', menuName: 'L', category: '피자' },
    ]);
    expect(map['X-1'].menuName).toBe('베이스 자체');
  });

  test('영양 메뉴의 카테고리·1인용 판정이 nutrition_menu_ref 복사본이 아니라 메뉴마스터를 따른다', () => {
    const map = buildMasterByCode(masters);
    // ref에 남은 옛 카테고리가 틀려도 메뉴마스터(피자)가 우선
    expect(resolveNutritionGroup({ menuCode: 'P-OR-006', category: '음료' }, map)).toBe('피자');
    expect(isPersonalPizzaMenu({ menuCode: 'P-ONE-002', menuName: '페페로니' }, map)).toBe(true);
  });

  test('라벨 컨텍스트와 베이스 메뉴 목록이 같은 헬퍼를 쓴다', () => {
    const ctx = readFileSync(resolve('lib/nutrition/label/context.js'), 'utf8');
    const list = readFileSync(resolve('components/nutrition/menu/base/MenuGroupList.jsx'), 'utf8');
    expect(ctx).toContain('const masterByCode = buildMasterByCode(masters);');
    expect(list).toContain('buildMasterByCode(asObjectArray(menuMasters))');
  });
});
