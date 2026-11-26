import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

// 2026-11-26 점검 목록 5번: 식자재 이슈 조회가 실패해도 0건(해결)으로 보이지 않는다.
// 훅이 쓰는 useState/useEffect/useRef만 대신해, 같은 상태를 유지한 채 다시 조회하는 상황을 만든다.
const state = [];
let cursor = 0;
const refs = [];
let refCursor = 0;
jest.unstable_mockModule('react', () => ({
  useState: initial => {
    const index = cursor++;
    if (!(index in state)) state[index] = initial;
    return [
      state[index],
      next => {
        state[index] = typeof next === 'function' ? next(state[index]) : next;
      },
    ];
  },
  useEffect: effect => effect(),
  useRef: initial => {
    const index = refCursor++;
    if (!(index in refs)) refs[index] = { current: initial };
    return refs[index];
  },
}));

let ingredientResult = async () => 1;
let dbInit = async () => {};
jest.unstable_mockModule('@/lib/db', () => ({ initDB: () => dbInit() }));
jest.unstable_mockModule('@/lib/sales', () => ({ getIssues: async () => [] }));
jest.unstable_mockModule('@/lib/menu-master', () => ({ getAllMenuMaster: async () => [] }));
jest.unstable_mockModule('@/lib/menu-master/recipe-summary', () => ({
  loadMenuRecipeSummaryMap: async () => new Map(),
}));
jest.unstable_mockModule('@/lib/menu-master/recipe-issues', () => ({
  buildRecipeIssues: () => [],
}));
jest.unstable_mockModule('@/lib/ingredient/issue-count', () => ({
  getIngredientIssueCount: () => ingredientResult(),
}));

globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };

const { usePageStats: pageStats, BADGE_STORES } = await import('../../hooks/usePageStats.js');

async function load() {
  cursor = 0;
  refCursor = 0;
  pageStats('/');
  for (let i = 0; i < 20; i += 1) await new Promise(resolve => setImmediate(resolve));
  return readState();
}
// 상태 선언 순서: 미매칭, 메뉴마스터, 식자재 건수, 식자재 실패, tick
const readState = () => ({ count: state[2], failed: state[3] });

beforeEach(() => {
  state.length = 0;
  refs.length = 0;
  ingredientResult = async () => 1;
  dbInit = async () => {};
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('식자재 이슈 배지', () => {
  test('조회가 실패하면 마지막 성공 건수를 유지하고 실패를 표시한다', async () => {
    expect(await load()).toEqual({ count: 1, failed: false });
    ingredientResult = async () => {
      throw new Error('조회 실패');
    };
    expect(await load()).toEqual({ count: 1, failed: true });
  });

  test('실제로 해결돼 조회에 성공해야 0건이 된다', async () => {
    await load();
    ingredientResult = async () => 0;
    expect(await load()).toEqual({ count: 0, failed: false });
  });

  test('처음부터 못 읽으면 0이 아니라 미확인(null)이다', async () => {
    ingredientResult = async () => {
      throw new Error('조회 실패');
    };
    expect(await load()).toEqual({ count: null, failed: true });
  });

  test('DB를 열지 못해도 실패로 표시한다', async () => {
    dbInit = async () => {
      throw new Error('DB blocked');
    };
    expect(await load()).toEqual({ count: null, failed: true });
  });

  test('배지는 화면 이동이 아니라 관련 저장소가 바뀔 때 다시 센다', () => {
    const hook = readFileSync(new URL('../../hooks/usePageStats.js', import.meta.url), 'utf8');
    expect(hook).toContain('}, [tick]);');
    expect(hook).toContain('if (failedRef.current) setTick(t => t + 1);');
    expect(hook).toContain('onStoresChanged(');
    for (const store of ['cost_ingredients', 'menu_master', 'price_rows', 'menu_sales_issues']) {
      expect(BADGE_STORES.has(store)).toBe(true);
    }
  });

  test('상단 알림은 실패하면 건수가 없어도 확인 필요를 보여 준다', () => {
    const topBar = readFileSync(new URL('../../components/TopBar.jsx', import.meta.url), 'utf8');
    expect(topBar).toContain('ingredientIssueCount > 0 || ingredientIssueFailed');
    expect(topBar).toContain("'식자재관리 이슈 확인 필요'");
    expect(topBar).toContain('마지막으로 확인한 건수는');
  });
});
