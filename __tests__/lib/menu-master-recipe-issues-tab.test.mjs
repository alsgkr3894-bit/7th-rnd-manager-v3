import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  buildRecipeIssues,
  filterIssuesByKind,
  ISSUE_KINDS,
  ISSUE_LABELS,
} from '../../lib/menu-master/recipe-issues.js';
import { MENU_RECIPE_SUMMARY_STATUS } from '../../lib/menu-master/recipe-summary.js';

const issuesPanelSrc = readFileSync(
  resolve('components/menu-master/MenuMasterIssuesPanel.jsx'),
  'utf8'
);
const menuMasterPageSrc = readFileSync(resolve('app/menu-master/page.jsx'), 'utf8');

// ── 픽스처 헬퍼 ──────────────────────────────────────────────────────────────

function makeMenu(overrides) {
  return {
    menuCode: 'P001',
    menuName: '테스트메뉴',
    category: '피자',
    size: 'L',
    price: 18000,
    ...overrides,
  };
}

function makeSummaryMap(entries) {
  return new Map(entries);
}

// ── buildRecipeIssues 로직 테스트 ────────────────────────────────────────────

describe('buildRecipeIssues — 이슈 분류 로직', () => {
  test('레시피 미작성 메뉴를 no-recipe로 분류한다', () => {
    const menus = [makeMenu()];
    const map = makeSummaryMap([
      ['P001', { status: MENU_RECIPE_SUMMARY_STATUS.MISSING, hasRecipe: false }],
    ]);
    const issues = buildRecipeIssues(menus, map);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe(ISSUE_KINDS.NO_RECIPE);
    expect(issues[0].menu.menuCode).toBe('P001');
  });

  test('수량 누락 메뉴를 needs-qty로 분류한다', () => {
    const menus = [makeMenu()];
    const map = makeSummaryMap([
      ['P001', { status: MENU_RECIPE_SUMMARY_STATUS.NEEDS_QUANTITY, hasRecipe: true }],
    ]);
    const issues = buildRecipeIssues(menus, map);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe(ISSUE_KINDS.NEEDS_QUANTITY);
  });

  test('단가 누락 메뉴를 needs-price로 분류한다', () => {
    const menus = [makeMenu()];
    const map = makeSummaryMap([
      ['P001', { status: MENU_RECIPE_SUMMARY_STATUS.NEEDS_PRICE, hasRecipe: true }],
    ]);
    const issues = buildRecipeIssues(menus, map);
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe(ISSUE_KINDS.NEEDS_PRICE);
  });

  test('판매가 0 또는 미입력 메뉴를 no-price로 분류한다', () => {
    const menus = [makeMenu({ price: 0 })];
    const map = makeSummaryMap([
      ['P001', { status: MENU_RECIPE_SUMMARY_STATUS.READY, hasRecipe: true }],
    ]);
    const issues = buildRecipeIssues(menus, map);
    expect(issues.some(i => i.kind === ISSUE_KINDS.NO_PRICE)).toBe(true);
  });

  test('판매가 null 메뉴를 no-price로 분류한다', () => {
    const menus = [makeMenu({ price: null })];
    const map = makeSummaryMap([
      ['P001', { status: MENU_RECIPE_SUMMARY_STATUS.READY, hasRecipe: true }],
    ]);
    const issues = buildRecipeIssues(menus, map);
    expect(issues.some(i => i.kind === ISSUE_KINDS.NO_PRICE)).toBe(true);
  });

  test('UNSUPPORTED 카테고리 메뉴는 이슈 목록에서 제외한다', () => {
    const menus = [makeMenu({ menuCode: 'E001', category: '엣지' })];
    const map = makeSummaryMap([
      ['E001', { status: MENU_RECIPE_SUMMARY_STATUS.UNSUPPORTED, hasRecipe: false }],
    ]);
    const issues = buildRecipeIssues(menus, map);
    expect(issues).toHaveLength(0);
  });

  test('summary가 없는 메뉴는 이슈 목록에서 제외한다', () => {
    const menus = [makeMenu({ menuCode: 'X001' })];
    const map = makeSummaryMap([]);
    const issues = buildRecipeIssues(menus, map);
    expect(issues).toHaveLength(0);
  });

  test('레시피 정상 + 판매가 있는 메뉴는 이슈가 없다', () => {
    const menus = [makeMenu()];
    const map = makeSummaryMap([
      ['P001', { status: MENU_RECIPE_SUMMARY_STATUS.READY, hasRecipe: true }],
    ]);
    const issues = buildRecipeIssues(menus, map);
    expect(issues).toHaveLength(0);
  });

  test('레시피 미작성 + 판매가 없으면 이슈 2개가 발생한다', () => {
    const menus = [makeMenu({ price: null })];
    const map = makeSummaryMap([
      ['P001', { status: MENU_RECIPE_SUMMARY_STATUS.MISSING, hasRecipe: false }],
    ]);
    const issues = buildRecipeIssues(menus, map);
    expect(issues).toHaveLength(2);
    const kinds = issues.map(i => i.kind);
    expect(kinds).toContain(ISSUE_KINDS.NO_RECIPE);
    expect(kinds).toContain(ISSUE_KINDS.NO_PRICE);
  });

  test('여러 메뉴의 이슈를 모두 수집한다', () => {
    const menus = [makeMenu({ menuCode: 'A001' }), makeMenu({ menuCode: 'B001', price: 0 })];
    const map = makeSummaryMap([
      ['A001', { status: MENU_RECIPE_SUMMARY_STATUS.NEEDS_QUANTITY, hasRecipe: true }],
      ['B001', { status: MENU_RECIPE_SUMMARY_STATUS.READY, hasRecipe: true }],
    ]);
    const issues = buildRecipeIssues(menus, map);
    expect(issues).toHaveLength(2);
    expect(issues[0].menu.menuCode).toBe('A001');
    expect(issues[0].kind).toBe(ISSUE_KINDS.NEEDS_QUANTITY);
    expect(issues[1].menu.menuCode).toBe('B001');
    expect(issues[1].kind).toBe(ISSUE_KINDS.NO_PRICE);
  });

  test('빈 배열을 받으면 빈 배열을 반환한다', () => {
    expect(buildRecipeIssues([], new Map())).toHaveLength(0);
  });
});

// ── filterIssuesByKind 로직 테스트 ───────────────────────────────────────────

describe('filterIssuesByKind — 탭 필터', () => {
  const issues = [
    { menu: makeMenu({ menuCode: 'A' }), kind: ISSUE_KINDS.NO_RECIPE },
    { menu: makeMenu({ menuCode: 'B' }), kind: ISSUE_KINDS.NEEDS_QUANTITY },
    { menu: makeMenu({ menuCode: 'C' }), kind: ISSUE_KINDS.NO_PRICE },
  ];

  test("'all'이면 전체를 반환한다", () => {
    expect(filterIssuesByKind(issues, 'all')).toHaveLength(3);
  });

  test('kind 필터로 해당 종류만 반환한다', () => {
    const result = filterIssuesByKind(issues, ISSUE_KINDS.NO_RECIPE);
    expect(result).toHaveLength(1);
    expect(result[0].menu.menuCode).toBe('A');
  });

  test('해당 kind가 없으면 빈 배열을 반환한다', () => {
    expect(filterIssuesByKind(issues, ISSUE_KINDS.NEEDS_PRICE)).toHaveLength(0);
  });
});

// ── ISSUE_LABELS 상수 ────────────────────────────────────────────────────────

describe('ISSUE_LABELS 상수', () => {
  test('4가지 이슈 레이블이 모두 정의되어 있다', () => {
    expect(ISSUE_LABELS[ISSUE_KINDS.NO_RECIPE]).toBe('레시피 미작성');
    expect(ISSUE_LABELS[ISSUE_KINDS.NEEDS_QUANTITY]).toBe('수량 누락');
    expect(ISSUE_LABELS[ISSUE_KINDS.NEEDS_PRICE]).toBe('단가 누락');
    expect(ISSUE_LABELS[ISSUE_KINDS.NO_PRICE]).toBe('판매가 누락');
  });
});

// ── UI 구조 검증 ─────────────────────────────────────────────────────────────

describe('MenuMasterIssuesPanel — UI 구조', () => {
  test('buildRecipeIssues와 filterIssuesByKind를 사용한다', () => {
    expect(issuesPanelSrc).toContain('buildRecipeIssues');
    expect(issuesPanelSrc).toContain('filterIssuesByKind');
  });

  test('4가지 이슈 탭이 정의되어 있다', () => {
    expect(issuesPanelSrc).toContain('ISSUE_KINDS.NO_RECIPE');
    expect(issuesPanelSrc).toContain('ISSUE_KINDS.NEEDS_QUANTITY');
    expect(issuesPanelSrc).toContain('ISSUE_KINDS.NEEDS_PRICE');
    expect(issuesPanelSrc).toContain('ISSUE_KINDS.NO_PRICE');
  });

  test('이슈 없음 빈 상태 문구가 있다', () => {
    expect(issuesPanelSrc).toContain('이슈 없음');
  });

  test('viewer가 아닐 때 수정 버튼이 있다', () => {
    expect(issuesPanelSrc).toContain('isViewer');
    expect(issuesPanelSrc).toContain('onEdit(menu)');
  });
});

describe('app/menu-master/page — 이슈 탭 진입점', () => {
  test('MenuMasterIssuesPanel을 import한다', () => {
    expect(menuMasterPageSrc).toContain('MenuMasterIssuesPanel');
  });

  test('이슈 탭 viewMode 또는 이슈 토글이 있다', () => {
    expect(menuMasterPageSrc).toMatch(/viewMode|issueTab|이슈/);
  });
});
