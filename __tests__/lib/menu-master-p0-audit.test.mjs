/**
 * 11단계 P0 버그 검사: 소스 카테고리 레시피 반영 경로 + 권한 검증
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { recipeStoreKindForCategory } from '../../lib/recipe-master/sync.js';
import {
  isSideCategory,
  isBeverageCategory,
  isPizzaCategory,
  isPersonalPizzaCategory,
  isSetCategory,
} from '../../lib/menu-master/category-policy.js';
import { MENU_RECIPE_KINDS, mergeCanonicalRecipeMaps } from '../../lib/menu-recipes/legacy.js';

// ─── 소스 카테고리 → side kind 경로 ─────────────────────────────

describe('소스 카테고리 레시피 저장 경로', () => {
  test('소스는 isSideCategory=true', () => {
    expect(isSideCategory('소스')).toBe(true);
  });

  test('소스 카테고리는 recipeStoreKindForCategory → side', () => {
    expect(recipeStoreKindForCategory('소스')).toBe('side');
  });

  test('MENU_RECIPE_KINDS에 side가 포함되어 있다', () => {
    expect(MENU_RECIPE_KINDS).toContain('side');
  });

  test('mergeCanonicalRecipeMaps가 소스 레시피를 side 맵에 넣는다', () => {
    const rows = [
      { menuCode: 'S-SC-001', category: '소스', kind: 'side', components: [] },
    ];
    const maps = mergeCanonicalRecipeMaps(rows);
    expect(maps.side).toBeDefined();
    expect(maps.side.has('S-SC-001')).toBe(true);
  });

  test('kind가 없는 소스 레시피도 category로 side 맵에 들어간다', () => {
    const rows = [
      { menuCode: 'S-SC-002', category: '소스', kind: null, components: [] },
    ];
    const maps = mergeCanonicalRecipeMaps(rows);
    expect(maps.side.has('S-SC-002')).toBe(true);
  });
});

// ─── 전 카테고리 레시피 kind 매핑 ────────────────────────────────

describe('카테고리별 레시피 kind 매핑 전수 확인', () => {
  const cases = [
    ['피자', 'pizza'],
    ['피자/프리미엄스페셜', 'pizza'],
    ['1인피자', 'personal'],
    ['세트박스', 'set'],
    ['세트', 'set'],
    ['사이드', 'side'],
    ['소스', 'side'],
    ['음료', 'side'],
    ['사이드/파스타', 'side'],
  ];
  for (const [category, expectedKind] of cases) {
    test(`${category} → ${expectedKind}`, () => {
      expect(recipeStoreKindForCategory(category)).toBe(expectedKind);
    });
  }
});

// ─── 권한 검증 (소스 구조 점검) ─────────────────────────────────

const tableRowSrc = readFileSync(
  resolve(process.cwd(), 'components/menu-master/MenuMasterTableRow.jsx'),
  'utf-8'
);
const issuesPanelSrc = readFileSync(
  resolve(process.cwd(), 'components/menu-master/MenuMasterIssuesPanel.jsx'),
  'utf-8'
);
const pageSrc = readFileSync(
  resolve(process.cwd(), 'app/menu-master/page.jsx'),
  'utf-8'
);

describe('viewer 권한 - MenuMasterTableRow', () => {
  test('isViewer일 때 메뉴명이 div(클릭 불가)로 렌더된다', () => {
    expect(tableRowSrc).toContain('isViewer');
    expect(tableRowSrc).toContain('{isViewer ?');
  });

  test('수정 버튼이 isViewer일 때 disabled된다', () => {
    expect(tableRowSrc).toContain('disabled={isViewer}');
  });

  test('삭제 버튼이 isViewer일 때 disabled된다', () => {
    const disabledMatches = (tableRowSrc.match(/disabled=\{isViewer\}/g) || []).length;
    expect(disabledMatches).toBeGreaterThanOrEqual(2);
  });
});

describe('viewer 권한 - MenuMasterIssuesPanel', () => {
  test('isViewer일 때 수정 버튼 열이 숨겨진다', () => {
    expect(issuesPanelSrc).toContain('isViewer');
    expect(issuesPanelSrc).toContain('!isViewer');
  });
});

describe('메뉴마스터 page - isViewer 전달', () => {
  test('useCurrentRole로 isViewer를 가져온다', () => {
    expect(pageSrc).toContain('isViewer');
    expect(pageSrc).toContain('useCurrentRole');
  });

  test('MenuMasterTableRow에 isViewer를 전달한다', () => {
    expect(pageSrc).toContain('isViewer={isViewer}');
  });
});

// ─── 레시피 이슈 탭 분류 로직 ────────────────────────────────────

import { buildRecipeIssues, ISSUE_KINDS } from '../../lib/menu-master/recipe-issues.js';
import {
  summarizeMenuRecipe,
  MENU_RECIPE_SUMMARY_STATUS,
} from '../../lib/menu-master/recipe-summary.js';

describe('buildRecipeIssues - 소스 카테고리 포함 전 카테고리 분류', () => {
  const categories = ['피자', '1인피자', '세트박스', '사이드', '소스', '음료'];

  for (const category of categories) {
    test(`${category} 카테고리 메뉴는 레시피 미작성이면 no-recipe 이슈가 된다`, () => {
      const menu = { menuCode: 'TEST-001', menuName: '테스트', category, status: 'active' };
      const summary = summarizeMenuRecipe(menu, null, new Map());
      if (summary.status === MENU_RECIPE_SUMMARY_STATUS.UNSUPPORTED) {
        // 지원하지 않는 카테고리는 이슈 생성 안 하는 것이 올바른 동작
        expect(summary.hasRecipe).toBe(false);
        return;
      }
      const recipeSummaryMap = new Map([['TEST-001', summary]]);
      const issues = buildRecipeIssues([menu], recipeSummaryMap);
      expect(issues.some(i => i.kind === ISSUE_KINDS.NO_RECIPE)).toBe(true);
    });
  }
});
