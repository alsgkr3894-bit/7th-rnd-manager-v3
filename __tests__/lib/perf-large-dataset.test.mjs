/**
 * P5 성능 스모크 테스트 — 대량 데이터에서 핵심 필터/검색 연산 응답 시간 검증.
 * 측정 환경(Jest Node.js)이므로 React렌더 비용은 포함되지 않으나,
 * 순수 연산 비용이 큰 경우를 조기에 탐지한다.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── 픽스처 생성 헬퍼 ──────────────────────────────────────────

const CATEGORIES = ['피자', '사이드', '음료', '세트', '디저트'];
const TAGS = ['냉장', '냉동', '신선', '고기', '채소', '유제품'];

function makeIngredientRow(i) {
  return {
    id: i,
    productCode: `P${String(i).padStart(5, '0')}`,
    ingredientName: `식자재_${i}_${CATEGORIES[i % CATEGORIES.length]}`,
    category: CATEGORIES[i % CATEGORIES.length],
    tags: [TAGS[i % TAGS.length], TAGS[(i + 1) % TAGS.length]],
    unitPrice: i % 10 === 0 ? null : 1000 + (i % 500),
    discontinued: i % 20 === 0,
    excluded: i % 50 === 0,
    manufacturer: `제조사${i % 30}`,
  };
}

function makeMenuRow(i) {
  return {
    id: i,
    menuCode: `M${String(i).padStart(4, '0')}`,
    menuName: `메뉴_${i}_${CATEGORIES[i % CATEGORIES.length]}`,
    category: CATEGORIES[i % CATEGORIES.length],
    subCategory: i % 3 === 0 ? '레귤러' : '라지',
    status: i % 20 === 0 ? 'discontinued' : 'active',
  };
}

function makeRows(count, maker) {
  return Array.from({ length: count }, (_, i) => maker(i));
}

// ── 식자재 필터 로직 (useIngredientManageView 동일) ──────────────

function filterIngredients({ rows, catFilter, tagFilter, search }) {
  let list;
  if (catFilter === '__discontinued__') {
    list = rows.filter(r => r.discontinued);
  } else {
    list = rows.filter(r => !r.discontinued && !r.excluded);
    if (catFilter === '__none__') list = list.filter(r => !r.category);
    else if (catFilter === '__no_price__') list = list.filter(r => r.unitPrice == null);
    else if (catFilter !== 'all') list = list.filter(r => r.category === catFilter);
    if (tagFilter !== 'all') list = list.filter(r => (r.tags || []).includes(tagFilter));
  }
  const q = search.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    r =>
      (r.ingredientName || '').toLowerCase().includes(q) ||
      (r.productCode || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q) ||
      (r.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (r.manufacturer || '').toLowerCase().includes(q)
  );
}

// ── 메뉴마스터 필터 로직 (useMenuMasterFilters 동일) ─────────────

function filterMenus({ rows, statusFilter, catFilter, search }) {
  let list = statusFilter === 'all' ? rows : rows.filter(r => r.status === statusFilter);
  if (catFilter !== 'all') list = list.filter(r => (r.category || '').startsWith(catFilter));
  const q = search.trim().toLowerCase();
  if (q)
    list = list.filter(
      r =>
        (r.menuCode || '').toLowerCase().includes(q) ||
        (r.menuName || '').toLowerCase().includes(q) ||
        (r.subCategory || '').toLowerCase().includes(q)
    );
  return list;
}

// ── 임계값 (ms) ───────────────────────────────────────────────
const THRESHOLD_1K = 30;
const THRESHOLD_5K = 100;

// ── 테스트 ──────────────────────────────────────────────────

describe('P5 대량 데이터 성능 스모크', () => {
  describe('식자재 필터링', () => {
    const rows1k = makeRows(1000, makeIngredientRow);
    const rows5k = makeRows(5000, makeIngredientRow);

    test(`1,000행 전체 필터 < ${THRESHOLD_1K}ms`, () => {
      const t0 = performance.now();
      filterIngredients({ rows: rows1k, catFilter: 'all', tagFilter: 'all', search: '' });
      expect(performance.now() - t0).toBeLessThan(THRESHOLD_1K);
    });

    test(`1,000행 카테고리 + 검색 < ${THRESHOLD_1K}ms`, () => {
      const t0 = performance.now();
      filterIngredients({ rows: rows1k, catFilter: '피자', tagFilter: '냉장', search: '식자재_1' });
      expect(performance.now() - t0).toBeLessThan(THRESHOLD_1K);
    });

    test(`5,000행 전체 필터 < ${THRESHOLD_5K}ms`, () => {
      const t0 = performance.now();
      filterIngredients({ rows: rows5k, catFilter: 'all', tagFilter: 'all', search: '' });
      expect(performance.now() - t0).toBeLessThan(THRESHOLD_5K);
    });

    test(`5,000행 단가 없음 필터 < ${THRESHOLD_5K}ms`, () => {
      const t0 = performance.now();
      filterIngredients({
        rows: rows5k,
        catFilter: '__no_price__',
        tagFilter: 'all',
        search: '',
      });
      expect(performance.now() - t0).toBeLessThan(THRESHOLD_5K);
    });

    test(`5,000행 카테고리 + 검색 < ${THRESHOLD_5K}ms`, () => {
      const t0 = performance.now();
      filterIngredients({ rows: rows5k, catFilter: '사이드', tagFilter: '냉동', search: '식자재' });
      expect(performance.now() - t0).toBeLessThan(THRESHOLD_5K);
    });
  });

  describe('메뉴마스터 필터링', () => {
    const rows1k = makeRows(1000, makeMenuRow);
    const rows5k = makeRows(5000, makeMenuRow);

    test(`1,000행 active 필터 < ${THRESHOLD_1K}ms`, () => {
      const t0 = performance.now();
      filterMenus({ rows: rows1k, statusFilter: 'active', catFilter: 'all', search: '' });
      expect(performance.now() - t0).toBeLessThan(THRESHOLD_1K);
    });

    test(`5,000행 active + 카테고리 + 검색 < ${THRESHOLD_5K}ms`, () => {
      const t0 = performance.now();
      filterMenus({ rows: rows5k, statusFilter: 'active', catFilter: '피자', search: '메뉴_1' });
      expect(performance.now() - t0).toBeLessThan(THRESHOLD_5K);
    });
  });

  describe('noPriceCount 집계', () => {
    const rows5k = makeRows(5000, makeIngredientRow);

    test(`5,000행 noPriceCount useMemo 패턴 < ${THRESHOLD_5K}ms`, () => {
      const t0 = performance.now();
      const count = rows5k.filter(r => !r.discontinued && !r.excluded && r.unitPrice == null).length;
      const elapsed = performance.now() - t0;
      expect(count).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(THRESHOLD_5K);
    });
  });
});

describe('P5 핵심 selector memoization 구조 검증', () => {
  const MEMO_HOOKS = [
    ['useIngredientManageView', 'app/ingredient/manage/useIngredientManageView.js'],
    ['useMenuMasterFilters', 'hooks/useMenuMasterFilters.js'],
    ['useReportListState', 'hooks/useReportListState.js'],
    ['useIngredientPriceFilters', 'hooks/useIngredientPriceFilters.js'],
    ['useNoteFilter', 'hooks/useNoteFilter.js'],
  ];

  for (const [name, path] of MEMO_HOOKS) {
    test(`${name}: filtered가 useMemo로 계산된다`, () => {
      const src = readFileSync(resolve(process.cwd(), path), 'utf-8');
      expect(src).toContain('useMemo');
      expect(src).toContain('filtered');
    });
  }
});
