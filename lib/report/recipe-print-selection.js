/**
 * lib/report/recipe-print-selection.js — 레시피 출력 카테고리/메뉴 선택 필터링
 *
 * 순수 함수. IO 없음. 원가계산 보고서의 레시피 출력 탭·부록·엑셀 시트가 모두
 * 이 필터를 거쳐 같은 선택 상태를 공유한다.
 */
import { recipePrintMenuId } from './recipe-print-rows';
import { RECIPE_PRINT_KIND_ORDER, RECIPE_PRINT_CATEGORY_META } from './recipe-print-categories';

/** 피자/1인피자만 "메뉴당 1페이지"가 의미 있다 — 나머지는 카테고리 안에서 이어붙인다. */
export const RECIPE_PAGE_PER_MENU_KINDS = new Set(['pizza', 'personal']);

/**
 * margin 보고서의 isMarginReportOptionSelected와 같은 규칙 — 체크 해제된 항목만
 * selection 객체에 `false`로 남는다. 빈 객체/undefined = 전체 선택.
 */
export function isRecipeMenuSelected(recipeSelection, menuId) {
  return recipeSelection?.[menuId] !== false;
}

/** cats({pizza,personal,set,side,topping,edge,...})에서 이 kind가 켜져 있는지 — 엣지는 대상 아님. */
export function isRecipeKindEnabled(cats, kind) {
  if (!kind) return true;
  if (!cats) return true;
  return cats[kind] !== false;
}

export function filterRecipePrintMenus(menus, { cats, recipeSelection } = {}) {
  return (Array.isArray(menus) ? menus : []).filter(
    menu => isRecipeKindEnabled(cats, menu.kind) && isRecipeMenuSelected(recipeSelection, menu.id)
  );
}

export function filterRecipePrintRows(rows, { cats, recipeSelection } = {}) {
  return (Array.isArray(rows) ? rows : []).filter(
    row =>
      isRecipeKindEnabled(cats, row.kind) &&
      isRecipeMenuSelected(recipeSelection, recipePrintMenuId(row))
  );
}

/**
 * 선택된 메뉴들을 카테고리(kind) 섹션으로 묶는다 — 레시피 출력 뷰/부록이 그대로 렌더한다.
 * @returns {Array<{key, kind, categoryLabel, color, pagePerMenu, menus}>}
 */
export function buildRecipePrintSections(menus, { pagePerMenu = true } = {}) {
  const byKind = new Map();
  for (const menu of Array.isArray(menus) ? menus : []) {
    const kind = menu.kind || '';
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind).push(menu);
  }

  const orderedKinds = [
    ...RECIPE_PRINT_KIND_ORDER.filter(k => byKind.has(k)),
    ...[...byKind.keys()].filter(k => !RECIPE_PRINT_KIND_ORDER.includes(k)),
  ];

  return orderedKinds.map(kind => {
    const meta = RECIPE_PRINT_CATEGORY_META[kind];
    const kindMenus = byKind.get(kind) || [];
    return {
      key: kind || 'unknown',
      kind,
      categoryLabel: meta?.label || kindMenus[0]?.categoryLabel || '기타',
      color: meta?.color || 'var(--text-3)',
      pagePerMenu: pagePerMenu && RECIPE_PAGE_PER_MENU_KINDS.has(kind),
      menus: kindMenus,
    };
  });
}

/**
 * 메뉴 선택 옵션 UI용 카테고리별 그룹 — 선택 개수를 함께 계산한다(전체선택/해제 버튼용).
 */
export function buildRecipeMenuGroups(menus, recipeSelection) {
  const sections = buildRecipePrintSections(menus, { pagePerMenu: false });
  return sections.map(section => ({
    key: section.key,
    kind: section.kind,
    categoryLabel: section.categoryLabel,
    color: section.color,
    total: section.menus.length,
    selectedCount: section.menus.filter(menu => isRecipeMenuSelected(recipeSelection, menu.id))
      .length,
    menus: section.menus,
  }));
}

/** true 값(=선택됨, 기본값과 동일)은 저장하지 않는다 — "빈 객체 = 전체 선택" 불변식 유지. */
export function pruneRecipeSelection(selection) {
  const next = {};
  for (const [key, value] of Object.entries(selection || {})) {
    if (value === false) next[key] = false;
  }
  return next;
}
