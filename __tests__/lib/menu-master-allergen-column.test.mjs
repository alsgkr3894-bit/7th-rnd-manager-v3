import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { menuAllergenLabel } from '../../lib/menu-master/allergen-summary.js';
import { MENU_RECIPE_SUMMARY_STATUS } from '../../lib/menu-master/recipe-summary.js';

const src = f => readFileSync(resolve(f), 'utf8');

describe('menuAllergenLabel', () => {
  test('레시피 요약이 없거나(status:missing) 레시피가 없으면 "레시피 없음"', () => {
    const map = new Map([['PZ1', new Set(['AL06'])]]);
    expect(menuAllergenLabel('PZ1', map, undefined)).toBe('레시피 없음');
    expect(menuAllergenLabel('PZ1', map, { status: MENU_RECIPE_SUMMARY_STATUS.MISSING })).toBe(
      '레시피 없음'
    );
  });

  test('레시피는 있지만 알레르기 집계 결과가 없거나 빈 집합이면 "—"', () => {
    const summary = { status: MENU_RECIPE_SUMMARY_STATUS.READY };
    expect(menuAllergenLabel('PZ-EMPTY', new Map(), summary)).toBe('—');
    expect(menuAllergenLabel('PZ-EMPTY', new Map([['PZ-EMPTY', new Set()]]), summary)).toBe('—');
  });

  test('알레르기 집합이 있으면 이름을 표시 순서대로 나열한다', () => {
    const map = new Map([['PZ1', new Set(['AL02', 'AL06'])]]); // 대두, 밀 코드 예시
    const summary = { status: MENU_RECIPE_SUMMARY_STATUS.READY };
    const label = menuAllergenLabel('PZ1', map, summary);
    expect(label).not.toBe('—');
    expect(label).not.toBe('레시피 없음');
    expect(label).toContain(',');
  });
});

describe('메뉴마스터 목록에 알레르기 열이 배선돼 있다', () => {
  const pageSrc = src('app/menu-master/page.jsx');
  const panelSrc = src('components/menu-master/MenuMasterTablePanel.jsx');
  const rowSrc = src('components/menu-master/MenuMasterTableRow.jsx');
  const loadingSrc = src('components/menu-master/MenuMasterLoadingTable.jsx');
  const exportSrc = src('app/menu-master/menuMasterExport.js');
  const summarySrc = src('lib/menu-master/allergen-summary.js');

  test('page.jsx가 loadMenuAllergenMap을 불러 실패해도 빈 Map으로 안전 처리한다', () => {
    expect(pageSrc).toContain(
      "import { loadMenuAllergenMap } from '@/lib/menu-master/allergen-summary'"
    );
    expect(pageSrc).toContain('nextMenuAllergenMap = await loadMenuAllergenMap(nextRows)');
    expect(pageSrc).toContain('menuAllergenMap={menuAllergenMap}');
    expect(pageSrc).toContain(
      'exportMenuMasterCsv(filtered, { menuAllergenMap, recipeSummaryMap })'
    );
  });

  test('TablePanel·Row·LoadingTable이 알레르기 열을 렌더한다', () => {
    expect(panelSrc).toContain(
      "import { menuAllergenLabel } from '@/lib/menu-master/allergen-summary'"
    );
    expect(panelSrc).toContain('<th style={{ width: 150 }}>알레르기</th>');
    expect(panelSrc).toContain('allergenLabel={menuAllergenLabel(');
    expect(rowSrc).toContain('allergenLabel');
    expect(loadingSrc).toContain('<th style={{ width: 150 }}>알레르기</th>');
  });

  test('CSV 내보내기가 menuAllergenMap이 있을 때만 알레르기 열을 포함한다', () => {
    expect(exportSrc).toContain(
      "import { menuAllergenLabel } from '@/lib/menu-master/allergen-summary'"
    );
    expect(exportSrc).toContain('const includeAllergen = menuAllergenMap instanceof Map');
    expect(exportSrc).toContain("'알레르기'");
  });

  test('allergen-summary.js는 기본 레시피 전용(edges/compositions 미포함)으로 가볍게 계산한다', () => {
    expect(summarySrc).toContain('edges: []');
    expect(summarySrc).toContain('compositions: []');
    expect(summarySrc).toContain('export async function loadMenuAllergenMap');
    expect(summarySrc).toContain('export function menuAllergenLabel');
  });
});
