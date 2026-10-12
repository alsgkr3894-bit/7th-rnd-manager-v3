import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  buildOriginFridgeSheet,
  buildOriginStatementLines,
  buildOriginStatementSheet,
  buildOriginStoreSheet,
  buildPizzaCommonSpans,
} from '../../lib/nutrition/origin/output-sheets.js';
import { buildOriginsFromIngredients } from '../../lib/nutrition/origin/build.js';

// 2026-10-12 주임님 지시(원산지표시판정리파일_B타입_260403.xlsx 양식): 도우·씬도우·까망베르 치즈를
// "피자공통"으로 분류해서 도우 → 씬도우 → 치즈 순으로 내보낸다.
// 실데이터: 도우는 일반 피자 16개에만 들어가고 1인피자 3개에는 없다(그래서 "모든 피자" 조건에서
// 빠졌다), 흑미씬도우는 어떤 메뉴에도 연결돼 있지 않다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const PIZZA_A = { menuCode: 'P-OR-001-L', menuName: '포크 피자 L', category: '피자/오리지널' };
const PIZZA_B = { menuCode: 'P-OR-002-L', menuName: '베이컨 피자 L', category: '피자/오리지널' };
const PIZZA_ONE = { menuCode: 'P-ONE-001', menuName: '더블치즈 피자(1인)', category: '1인피자' };
const SPAGHETTI = { menuCode: 'S-SPG-001', menuName: '오븐 스파게티', category: '사이드' };

const dough = {
  ingredientName: '도우',
  category: '도우/밀가루',
  items: [
    { displayName: '밀', country: '미국산,캐나다산 섞음' },
    { displayName: '흑미', country: '국내산' },
  ],
  menuCodes: [PIZZA_A, PIZZA_B], // 1인피자에는 없다
};
const thinDough = {
  ingredientName: '흑미씬도우',
  category: '도우/밀가루',
  items: [
    { displayName: '밀', country: '말레이시아산' },
    { displayName: '그레인', country: '미국산,캐나다산,호주산 섞음' },
    { displayName: '흑미', country: '태국산' },
  ],
  menuCodes: [], // 어느 메뉴에도 연결 안 됨
};
const cheese = {
  ingredientName: '까망베르슈레드치즈',
  category: '치즈류',
  items: [
    { displayName: '까망베르치즈', country: '덴마크산' },
    { displayName: '모짜렐라치즈', country: '덴마크산,미국산섞음' },
    { displayName: '고다치즈', country: '네덜란드산' },
  ],
  menuCodes: [PIZZA_A, PIZZA_B, PIZZA_ONE, SPAGHETTI],
};
const bacon = {
  ingredientName: '베이컨',
  category: '가공육',
  items: [{ displayName: '돼지고기', country: '미국산' }],
  menuCodes: [PIZZA_B],
};
// 입력 순서를 일부러 섞는다(정렬이 입력 순서에 기대면 안 됨)
const origins = [bacon, thinDough, cheese, dough];

describe('피자공통: 도우 → 씬도우 → 치즈', () => {
  test('매장비치용 — 세 재료가 맨 앞 피자공통 행으로, 양식 순서와 표기 그대로', () => {
    const sheet = buildOriginStoreSheet(origins, [], {});
    expect(
      sheet.slice(0, 3).map(row => [row.displayName, row.originCountry, row.pizzaCommon])
    ).toEqual([
      ['밀, 흑미(도우)', '(밀:미국산,캐나다산 섞음/흑미:국내산)', true],
      [
        '밀, 그레인, 흑미(씬도우)',
        '(밀:말레이시아산/그레인:미국산,캐나다산,호주산 섞음/흑미:태국산)',
        true,
      ],
      [
        '치즈(까망베르, 모짜렐라, 고다)',
        '(까망베르:덴마크산/모짜렐라:덴마크산,미국산섞음/고다:네덜란드산)',
        true,
      ],
    ]);
    expect(sheet[3]).toMatchObject({ displayName: '돼지고기(베이컨)', pizzaCommon: false });
  });

  test('피자공통 행의 메뉴명 칸은 "피자공통"만 — 치즈가 쓰이는 스파게티 등은 덧붙이지 않는다', () => {
    const sheet = buildOriginStoreSheet(origins, [], {});
    expect(sheet[0].menus).toEqual(['피자공통']);
    expect(sheet[1].menus).toEqual(['피자공통']);
    expect(sheet[2].menus).toEqual(['피자공통']);
    // 메뉴명이 같은 연속 행(도우·씬도우·치즈)은 기준 양식처럼 한 칸으로 합친다
    expect(buildPizzaCommonSpans(sheet)).toEqual([{ start: 0, length: 3 }]);
    // 피자공통이 아닌 재료는 쓰이는 메뉴를 그대로 나열한다
    expect(sheet[3].menus).toEqual(['베이컨']);
  });

  test('냉장고부착용 — 양식 순서(도우 → 씬도우 → 치즈)와 음식명·표시품목', () => {
    const sheet = buildOriginFridgeSheet(origins, {});
    expect(
      sheet.slice(0, 3).map(row => [row.ingredientName, row.itemText, row.originText])
    ).toEqual([
      ['도우', '밀, 흑미', '(밀:미국산,캐나다산 섞음/흑미:국내산)'],
      [
        '씬도우',
        '밀, 그레인, 흑미',
        '(밀:말레이시아산/그레인:미국산,캐나다산,호주산 섞음/흑미:태국산)',
      ],
      [
        '치즈',
        '치즈(까망베르, 모짜렐라, 고다)',
        '(까망베르:덴마크산/모짜렐라:덴마크산,미국산섞음/고다:네덜란드산)',
      ],
    ]);
    expect(sheet[3].ingredientName).toBe('베이컨');
  });

  test('원산지정보 표기문 — ※ 피자공통 아래 도우·씬도우·치즈 한 줄씩', () => {
    const sheet = buildOriginStatementSheet(origins, {});
    expect(sheet.slice(0, 3).map(row => [row.names, row.pizzaCommon])).toEqual([
      ['도우', true],
      ['씬도우', true],
      ['치즈', true],
    ]);
    const lines = buildOriginStatementLines(sheet);
    expect(lines[0]).toBe('※ 피자공통');
    expect(lines.slice(1, 4).map(line => line.split('(')[0])).toEqual(['도우', '씬도우', '치즈']);
    expect(lines.slice(4)).toEqual(['', '베이컨(돼지고기 : 미국산)']);
  });

  test('식자재명 편집(오버라이드)이 있으면 그 이름이 우선', () => {
    const overrides = { 흑미씬도우: '흑미 씬도우', 까망베르슈레드치즈: '슈레드치즈' };
    expect(
      buildOriginFridgeSheet(origins, overrides)
        .slice(0, 3)
        .map(r => r.ingredientName)
    ).toEqual(['도우', '흑미 씬도우', '슈레드치즈']);
    expect(
      buildOriginStatementSheet(origins, overrides)
        .slice(0, 3)
        .map(r => r.names)
    ).toEqual(['도우', '흑미 씬도우', '슈레드치즈']);
  });
});

describe('분류가 과하게 번지지 않는다', () => {
  test('도우가 아닌 재료·표시품목이 하나인 치즈는 건드리지 않는다', () => {
    const single = {
      ingredientName: '체다치즈',
      category: '치즈류',
      items: [{ displayName: '체다치즈', country: '미국산' }],
      menuCodes: [PIZZA_B],
    };
    const flour = {
      ingredientName: '밀가루',
      category: '도우/밀가루',
      items: [{ displayName: '밀', country: '미국산' }],
      menuCodes: [PIZZA_B],
    };
    const sheet = buildOriginStoreSheet([single, flour, bacon], [], {});
    expect(sheet.every(row => !row.pizzaCommon)).toBe(true);
    expect(sheet.map(row => row.displayName)).toContain('체다치즈(체다치즈)');
  });

  test('돼지고기·쇠고기처럼 끝 글자가 같은 표시품목은 치즈 묶음으로 보지 않는다', () => {
    const pepperoni = {
      ingredientName: '페페로니',
      category: '가공육',
      items: [
        { displayName: '돼지고기', country: '국내산' },
        { displayName: '쇠고기', country: '호주산' },
      ],
      menuCodes: [PIZZA_A, PIZZA_B],
    };
    const [row] = buildOriginStoreSheet([pepperoni], [], {});
    expect(row.displayName).toBe('돼지고기, 쇠고기(페페로니)');
    expect(row.originCountry).toBe('(돼지고기:국내산/쇠고기:호주산)');
  });

  test('피자가 한 종류뿐이면 도우도 피자공통으로 뭉개지 않는다', () => {
    const lone = { ...dough, menuCodes: [PIZZA_A] };
    const sheet = buildOriginStoreSheet([lone], [], {});
    expect(sheet.every(row => !row.pizzaCommon)).toBe(true);
  });
});

describe('출력용 원산지 행에 식자재 분류가 실린다', () => {
  test('buildOriginsFromIngredients가 category를 넘긴다', () => {
    const rows = buildOriginsFromIngredients(
      [
        {
          ingredientName: '도우',
          productCode: '31002132',
          category: '도우/밀가루',
          origin: dough.items,
        },
      ],
      new Map(),
      new Set(),
      new Set(),
      {},
      {}
    );
    expect(rows[0].category).toBe('도우/밀가루');
    expect(read('lib/nutrition/origin/build.js')).toContain(
      'category: asDisplayText(ing.category)'
    );
  });
});
