import { afterAll, afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

// DOM 없이 훅을 돌리기 위한 최소 런타임: 슬롯 순서대로 상태를 보관하고,
// 의존성이 바뀐 effect만 (이전 cleanup 후) 렌더 뒤에 실행한다.
let fiber = null;
let dirty = false;
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
function slot(init) {
  const index = fiber.cursor++;
  if (!(index in fiber.slots)) fiber.slots[index] = init();
  return fiber.slots[index];
}
function useMemo(factory, deps) {
  const cell = slot(() => ({}));
  if (!sameDeps(cell.deps, deps)) Object.assign(cell, { value: factory(), deps });
  return cell.value;
}

jest.unstable_mockModule('react', () => ({
  useState(initial) {
    const cell = slot(() => ({ value: initial }));
    cell.set ??= next => {
      const value = typeof next === 'function' ? next(cell.value) : next;
      if (!Object.is(value, cell.value)) dirty = true;
      cell.value = value;
    };
    return [cell.value, cell.set];
  },
  useRef: initial => slot(() => ({ current: initial })),
  useMemo,
  useCallback: (fn, deps) => useMemo(() => fn, deps),
  useEffect(effect, deps) {
    const cell = slot(() => ({}));
    if (sameDeps(cell.deps, deps)) return;
    cell.deps = deps;
    fiber.effects.push(() => {
      cell.cleanup?.();
      cell.cleanup = effect();
    });
  },
}));

// Next 라우터 흉내: useSearchParams는 라우터가 아는 주소를 돌려주고, history.replaceState는
// 라우터의 effect(페이지 effect보다 늦게 실행)가 설치된 뒤에만 라우터 주소를 갱신한다.
let routerHref = '';
let routerPatched = false;
jest.unstable_mockModule('next/navigation', () => ({
  useSearchParams: () => new URL(routerHref).searchParams,
}));

// 저장된 분류 복원 순서까지 검증하도록 useLocalStorage는 실제 훅을 쓴다.
jest.unstable_mockModule('@/hooks/useDebounce', () => ({ useDebounce: value => value }));
jest.unstable_mockModule('@/hooks/useCurrentRole', () => ({
  useCurrentRole: () => ({ isViewer: false }),
}));
jest.unstable_mockModule('@/hooks/usePriceRiseAlert', () => ({ usePriceRiseAlert: () => ({}) }));
jest.unstable_mockModule('../../app/ingredient/manage/useIngredientManageData.js', () => ({
  useIngredientManageData: () => ({ rows: [], loading: false }),
}));
jest.unstable_mockModule('../../app/ingredient/manage/useDiscontinuedRefs.js', () => ({
  useDiscontinuedRefs: () => ({}),
}));
jest.unstable_mockModule('../../app/ingredient/manage/useIngredientManageView.js', () => ({
  useIngredientManageView: () => ({ filtered: [] }),
}));
jest.unstable_mockModule('../../app/ingredient/manage/useIngredientManageActions.js', () => ({
  useIngredientManageActions: () => ({}),
}));
jest.unstable_mockModule(
  '../../app/ingredient/manage/useIngredientJetteIssueVisibility.js',
  () => ({
    useIngredientJetteIssueVisibility: () => ({}),
  })
);
jest.unstable_mockModule('@/components/ingredient/manage-row/manageRowUtils', () => ({
  isDeletableIngredientRow: () => true,
}));
jest.unstable_mockModule('@/lib/ingredient', () => ({ previewIngredientDelete: jest.fn() }));
jest.unstable_mockModule('@/components/Toast', () => ({ showToast: jest.fn() }));
jest.unstable_mockModule('@/lib/db', () => ({ restoreRecord: jest.fn(), hasStore: jest.fn() }));
jest.unstable_mockModule('@/lib/shipment', () => ({
  getManagedProducts: jest.fn(),
  addManagedProduct: jest.fn(),
  updateManagedProduct: jest.fn(),
}));
jest.unstable_mockModule('@/components/jette/managed-products-constants', () => ({
  TYPE_LABEL: {},
}));
jest.unstable_mockModule('@/lib/auth/guard', () => ({ assertActiveAdmin: jest.fn() }));

const { useIngredientManagePage } =
  await import('../../app/ingredient/manage/useIngredientManagePage.js');
const { IngredientManageViewUrlSync } =
  await import('../../app/ingredient/manage/IngredientManageViewUrlSync.js');
const { KEYS } = await import('../../lib/note/keys.js');

const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;
const PATH = 'http://localhost/ingredient/manage';
let stored;

function createFiber() {
  return { slots: [], cursor: 0, effects: [] };
}

function renderInto(target, component) {
  fiber = target;
  fiber.cursor = 0;
  const result = component();
  fiber = null;
  return result;
}

// page.jsx처럼 페이지 훅 + URL 구독 컴포넌트를 함께 마운트한다.
function mountPage(search = '') {
  window.location.href = routerHref = PATH + search;
  const page = createFiber();
  const sync = createFiber();
  let result;

  const render = () => {
    dirty = false;
    const hrefBefore = routerHref;
    result = renderInto(page, useIngredientManagePage);
    renderInto(sync, () =>
      IngredientManageViewUrlSync({
        onViewParam: result.pageState.syncViewFromUrl,
        onLinkParams: result.onLinkParams,
      })
    );
    // React와 같이 자식 effect가 부모보다 먼저 실행된다.
    [...sync.effects.splice(0), ...page.effects.splice(0)].forEach(effect => effect());
    routerPatched = true;
    if (dirty || routerHref !== hrefBefore) render();
  };
  // 미뤄 둔 파라미터 적용까지 끝낸다.
  const settle = () => {
    render();
    jest.runAllTimers();
    render();
  };
  settle();

  return {
    get state() {
      return result.pageState;
    },
    get batch() {
      return result.batch;
    },
    act(change) {
      change(result);
      settle();
    },
    // 클라이언트 이동: 리마운트 없이 주소만 바뀐다.
    navigate(nextSearch) {
      window.location.href = routerHref = PATH + nextSearch;
      settle();
    },
  };
}

const PALETTE_LINK = '?query=%EC%B9%98%EC%A6%88&highlight=7&productCode=P-7';

beforeEach(() => {
  jest.useFakeTimers();
  routerPatched = false;
  stored = new Map();
  globalThis.localStorage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  };
  const location = {
    href: PATH,
    get search() {
      return new URL(this.href).search;
    },
  };
  globalThis.window = {
    location,
    history: {
      replaceState: (_data, _title, url) => {
        location.href = String(url);
        if (routerPatched) routerHref = location.href;
      },
    },
  };
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  globalThis.window = originalWindow;
  globalThis.localStorage = originalLocalStorage;
});

describe('식자재관리 — 링크 파라미터 적용', () => {
  test('화면에 머문 채 통합 검색 링크로 이동하면 검색·강조를 적용하고 주소에서 지운다', () => {
    const page = mountPage();

    page.navigate(PALETTE_LINK);

    expect(page.state).toMatchObject({
      search: '치즈',
      highlightId: '7',
      highlightProductCode: 'P-7',
    });
    expect(window.location.href).toBe(PATH);
  });

  test('화면에 머문 채 단가 없음 링크로 이동하면 분류 필터를 적용하고 저장한다', () => {
    const page = mountPage();

    page.navigate('?catFilter=__no_price__');

    expect(page.state.catFilter).toBe('__no_price__');
    expect(stored.get(KEYS.INGREDIENT_CAT_FILTER)).toBe('"__no_price__"');
    expect(window.location.href).toBe(PATH);
  });

  test('처음 진입할 때는 주소의 분류가 저장된 분류보다 우선한다', () => {
    stored.set(KEYS.INGREDIENT_CAT_FILTER, '"유제품"');

    const page = mountPage('?catFilter=__no_price__');

    expect(page.state.catFilter).toBe('__no_price__');
    expect(window.location.href).toBe(PATH);
  });

  test('파라미터가 없는 이동은 사용자가 입력한 검색어·필터를 지우지 않는다', () => {
    const page = mountPage();
    page.act(({ pageState }) => {
      pageState.setSearch('치즈');
      pageState.setCatFilter('유제품');
      pageState.setTagFilter('냉장');
    });

    page.navigate('?view=issues');
    page.navigate('');

    expect(page.state).toMatchObject({ search: '치즈', catFilter: '유제품', tagFilter: '냉장' });
  });

  test('링크에 없는 항목은 그대로 둔다', () => {
    const page = mountPage();
    page.act(({ pageState }) => pageState.setSearch('소스'));

    page.navigate('?catFilter=__no_price__');
    expect(page.state).toMatchObject({ search: '소스', catFilter: '__no_price__' });

    page.navigate('?query=%EC%B9%98%EC%A6%88');
    expect(page.state).toMatchObject({ search: '치즈', catFilter: '__no_price__' });
  });

  test.each([
    ['앱 안에서 이동해 온 뒤', ''],
    ['링크 주소로 바로 진입한 뒤', PALETTE_LINK],
  ])('%s 같은 링크를 다시 눌러도 적용한다', (_label, entry) => {
    const page = mountPage(entry);
    page.navigate(PALETTE_LINK);
    page.act(({ pageState }) => {
      pageState.setSearch('');
      pageState.clearHighlight();
    });

    page.navigate(PALETTE_LINK);

    expect(page.state).toMatchObject({ search: '치즈', highlightId: '7' });
    expect(window.location.href).toBe(PATH);
  });

  test('새 강조 대상이 오면 직전 대상의 제품코드는 남기지 않는다', () => {
    const page = mountPage(PALETTE_LINK);

    page.navigate('?query=%EC%86%8C%EC%8A%A4&highlight=9');

    expect(page.state).toMatchObject({ highlightId: '9', highlightProductCode: null });
  });

  test('다른 탭에서 검색 링크로 이동하면 목록 탭에서 적용하고, 다른 파라미터는 남긴다', () => {
    const page = mountPage('?view=price');

    page.navigate(`${PALETTE_LINK}&from=home`);

    expect(page.state).toMatchObject({ view: 'manage', search: '치즈' });
    expect(window.location.href).toBe(`${PATH}?from=home`);
  });

  test('링크로 분류가 바뀌면 일괄 선택을 비운다', () => {
    const page = mountPage();
    page.act(({ batch }) => {
      batch.startBatch();
      batch.toggleSelect(1);
    });
    expect(page.batch.selected.size).toBe(1);

    page.navigate('?catFilter=__no_price__');

    expect(page.batch.selected.size).toBe(0);
    expect(page.batch.batchMode).toBe(true);
  });
});
