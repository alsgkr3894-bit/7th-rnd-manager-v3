/**
 * 레시피 출력(메뉴별 레시피 원가)에 단종 메뉴가 나오던 문제 (2026-09-29 주임님).
 * 판매가 테이블에서는 단종이 이미 빠져 종합원가표·마진표에는 안 나오지만, 레시피 기준인
 * buildRecipePrintRows는 저장된 레시피를 전부 돌아서 단종 메뉴 11개(실데이터 84행 중)가 섞였다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
  buildDiscontinuedMenuCodeSet,
  buildRecipePrintRows,
} from '../../lib/report/recipe-print-rows.js';

const recipe = (menuCode, menuName, size) => ({
  menuCode,
  menuName,
  size,
  category: '피자/프리미엄',
  components: [{ ingredientName: '치즈', productCode: 'C1', quantity: 10, unitPrice: 10 }],
});
const detailMaps = {
  pizza: new Map([
    ['P-PR-001-L', recipe('P-PR-001-L', '고구마 피자 L', 'L')],
    ['P-PR-001-R', recipe('P-PR-001-R', '고구마 피자 R', 'R')],
    ['P-PR-002-L', recipe('P-PR-002-L', '화이트쉬림프 피자 L', 'L')],
    ['P-PR-002-R', recipe('P-PR-002-R', '화이트쉬림프 피자 R', 'R')],
  ]),
};
const masters = [
  { menuCode: 'P-PR-001-L', status: 'discontinued' },
  { menuCode: 'P-PR-001-R', status: 'discontinued' },
  { menuCode: 'P-PR-002-L', status: 'active' },
  { menuCode: 'P-PR-002-R', status: 'active' },
  { menuCode: 'S-PKL-002', status: 'discontinued' },
  { menuCode: '', status: 'discontinued' },
];

describe('buildDiscontinuedMenuCodeSet', () => {
  test('단종 행의 메뉴코드만 모은다 (판매 중·빈 코드 제외)', () => {
    expect([...buildDiscontinuedMenuCodeSet(masters)].sort()).toEqual([
      'P-PR-001-L',
      'P-PR-001-R',
      'S-PKL-002',
    ]);
  });

  test('배열이 아니어도 던지지 않는다', () => {
    expect(buildDiscontinuedMenuCodeSet(undefined).size).toBe(0);
    expect(buildDiscontinuedMenuCodeSet(null).size).toBe(0);
  });
});

describe('buildRecipePrintRows — 단종 메뉴 제외', () => {
  const namesOf = rows => rows.map(r => r.menuName).sort();

  test('제외 목록을 안 주면 종전처럼 전부 나온다 (기본 동작 유지)', () => {
    expect(buildRecipePrintRows({ detailMaps })).toHaveLength(4);
  });

  test('단종 메뉴의 레시피 행은 빠지고 판매 중 메뉴만 남는다', () => {
    const rows = buildRecipePrintRows({
      detailMaps,
      excludeMenuCodes: buildDiscontinuedMenuCodeSet(masters),
    });
    expect(namesOf(rows)).toEqual(['화이트쉬림프 피자 L', '화이트쉬림프 피자 R']);
  });

  test('L만 단종이어도 그 행만 빠진다 (행 단위 판정)', () => {
    const rows = buildRecipePrintRows({
      detailMaps,
      excludeMenuCodes: new Set(['P-PR-002-L']),
    });
    expect(namesOf(rows)).toEqual(['고구마 피자 L', '고구마 피자 R', '화이트쉬림프 피자 R']);
  });

  test('Set이 아닌 값이 들어와도 던지지 않고 전부 나온다', () => {
    expect(buildRecipePrintRows({ detailMaps, excludeMenuCodes: ['P-PR-001-L'] })).toHaveLength(4);
  });
});

describe('원가보고서 화면이 단종 메뉴를 넘긴다', () => {
  test('page.jsx가 메뉴마스터를 읽어 excludeMenuCodes로 전달한다', () => {
    const page = readFileSync(resolve('app/report/cost/page.jsx'), 'utf8');
    expect(page).toContain('getAllMenuMaster()');
    // 단종 코드는 하프앤하프 원가 후보에서도 빼야 해서 변수로 한 번 만들어 같이 쓴다
    expect(page).toContain('const discontinuedCodes = buildDiscontinuedMenuCodeSet(masters)');
    expect(page).toContain('excludeMenuCodes: discontinuedCodes');
  });
});
