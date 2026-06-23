import { MENU_RECIPE_SUMMARY_STATUS } from './recipe-summary.js';
import { asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

export const QUALITY_KINDS = {
  DUPLICATE_CODE: 'duplicate-code',
  MISSING_SELLING_PRICE: 'missing-selling-price',
  MISSING_UNIT_PRICE: 'missing-unit-price',
  MISSING_RECIPE: 'missing-recipe',
  MISSING_NUTRITION: 'missing-nutrition',
  MISSING_ORIGIN: 'missing-origin',
  MISSING_ALLERGEN: 'missing-allergen',
};

export const QUALITY_KIND_ORDER = [
  QUALITY_KINDS.DUPLICATE_CODE,
  QUALITY_KINDS.MISSING_SELLING_PRICE,
  QUALITY_KINDS.MISSING_UNIT_PRICE,
  QUALITY_KINDS.MISSING_RECIPE,
  QUALITY_KINDS.MISSING_NUTRITION,
  QUALITY_KINDS.MISSING_ORIGIN,
  QUALITY_KINDS.MISSING_ALLERGEN,
];

export const QUALITY_LABELS = {
  [QUALITY_KINDS.DUPLICATE_CODE]: '중복 코드',
  [QUALITY_KINDS.MISSING_SELLING_PRICE]: '판매가 없음',
  [QUALITY_KINDS.MISSING_UNIT_PRICE]: '단가 없음',
  [QUALITY_KINDS.MISSING_RECIPE]: '레시피 없음',
  [QUALITY_KINDS.MISSING_NUTRITION]: '영양 누락',
  [QUALITY_KINDS.MISSING_ORIGIN]: '원산지 누락',
  [QUALITY_KINDS.MISSING_ALLERGEN]: '알레르기 누락',
};

export const QUALITY_TONE = {
  [QUALITY_KINDS.DUPLICATE_CODE]: { background: 'var(--negative-soft)', color: 'var(--negative)' },
  [QUALITY_KINDS.MISSING_SELLING_PRICE]: {
    background: 'var(--negative-soft)',
    color: 'var(--negative)',
  },
  [QUALITY_KINDS.MISSING_UNIT_PRICE]: { background: 'var(--warn-soft)', color: 'var(--warn)' },
  [QUALITY_KINDS.MISSING_RECIPE]: { background: 'var(--negative-soft)', color: 'var(--negative)' },
  [QUALITY_KINDS.MISSING_NUTRITION]: { background: 'var(--warn-soft)', color: 'var(--warn)' },
  [QUALITY_KINDS.MISSING_ORIGIN]: { background: 'var(--warn-soft)', color: 'var(--warn)' },
  [QUALITY_KINDS.MISSING_ALLERGEN]: { background: 'var(--warn-soft)', color: 'var(--warn)' },
};

function text(value) {
  return String(value ?? '').trim();
}

function menuKey(menu, index) {
  return text(menu?.menuCode) || `row-${index}`;
}

function menuPrice(menu) {
  return asFiniteNumber(menu?.price, null) ?? asFiniteNumber(menu?.sellingPrice, null);
}

function addIssue(issues, kind, menu, detail = '') {
  issues.push({
    kind,
    label: QUALITY_LABELS[kind] || kind,
    menu,
    menuCode: text(menu?.menuCode),
    menuName: text(menu?.menuName),
    category: text(menu?.category),
    detail,
  });
}

function isMissingReadinessDim(readiness, dimId) {
  return readiness?.dims?.[dimId]?.status === 'missing';
}

function dimDetail(readiness, dimId, fallback) {
  return text(readiness?.dims?.[dimId]?.detail) || fallback;
}

function isRecipeMissing(summary, readiness) {
  if (summary?.status === MENU_RECIPE_SUMMARY_STATUS.UNSUPPORTED) return false;
  if (summary && summary.hasRecipe === false) return true;
  return isMissingReadinessDim(readiness, 'recipe');
}

export function buildMenuDataQualityReport(
  menus = [],
  recipeSummaryMap = new Map(),
  readinessMap = new Map()
) {
  const safeMenus = asObjectArray(menus);
  const issues = [];
  const codeGroups = new Map();

  safeMenus.forEach((menu, index) => {
    const code = text(menu?.menuCode);
    if (!code) return;
    if (!codeGroups.has(code)) codeGroups.set(code, []);
    codeGroups.get(code).push({ menu, index });
  });

  for (const [code, group] of codeGroups) {
    if (group.length <= 1) continue;
    group.forEach(({ menu }) => {
      addIssue(
        issues,
        QUALITY_KINDS.DUPLICATE_CODE,
        menu,
        `${code} 코드가 ${group.length}개 있습니다`
      );
    });
  }

  safeMenus.forEach((menu, index) => {
    const key = menuKey(menu, index);
    const code = text(menu?.menuCode);
    const readiness = code ? readinessMap.get(code) : null;
    const summary = code ? recipeSummaryMap.get(code) : null;
    const price = menuPrice(menu);

    if (price == null || price <= 0 || isMissingReadinessDim(readiness, 'price')) {
      addIssue(
        issues,
        QUALITY_KINDS.MISSING_SELLING_PRICE,
        menu,
        dimDetail(readiness, 'price', '판매가를 입력해야 합니다')
      );
    }

    if ((summary?.missingPriceCount || 0) > 0) {
      addIssue(
        issues,
        QUALITY_KINDS.MISSING_UNIT_PRICE,
        menu,
        `레시피 구성품 ${summary.missingPriceCount}개 단가가 없습니다`
      );
    }

    if (isRecipeMissing(summary, readiness)) {
      addIssue(
        issues,
        QUALITY_KINDS.MISSING_RECIPE,
        menu,
        dimDetail(readiness, 'recipe', '레시피 구성이 없습니다')
      );
    }

    if (isMissingReadinessDim(readiness, 'nutrition')) {
      addIssue(
        issues,
        QUALITY_KINDS.MISSING_NUTRITION,
        menu,
        dimDetail(readiness, 'nutrition', '영양성분 값이 없습니다')
      );
    }

    if (isMissingReadinessDim(readiness, 'origin')) {
      addIssue(
        issues,
        QUALITY_KINDS.MISSING_ORIGIN,
        menu,
        dimDetail(readiness, 'origin', '원산지 출력 데이터가 없습니다')
      );
    }

    if (isMissingReadinessDim(readiness, 'allergen')) {
      addIssue(
        issues,
        QUALITY_KINDS.MISSING_ALLERGEN,
        menu,
        dimDetail(readiness, 'allergen', '알레르기 출력 데이터가 없습니다')
      );
    }

    if (!code && key) {
      addIssue(
        issues,
        QUALITY_KINDS.DUPLICATE_CODE,
        menu,
        '메뉴코드가 비어 있어 중복 판정을 할 수 없습니다'
      );
    }
  });

  const categories = QUALITY_KIND_ORDER.map(kind => ({
    kind,
    label: QUALITY_LABELS[kind],
    count: issues.filter(issue => issue.kind === kind).length,
    items: issues.filter(issue => issue.kind === kind),
  }));

  return {
    total: issues.length,
    menus: safeMenus.length,
    issues,
    categories,
    ok: issues.length === 0,
  };
}
