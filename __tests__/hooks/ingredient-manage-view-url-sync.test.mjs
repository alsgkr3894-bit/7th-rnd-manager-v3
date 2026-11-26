import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

// DOM 없이 훅을 돌리기 위한 최소 런타임: 슬롯 순서대로 상태를 보관하고,
// 의존성이 바뀐 effect만 렌더 뒤에 실행한다.
let fiber = null;
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
function slot(init) {
  const index = fiber.cursor++;
  if (!(index in fiber.slots)) fiber.slots[index] = init();
  return fiber.slots[index];
}
function useMemoized(factory, deps) {
  const cell = slot(() => ({}));
  if (!sameDeps(cell.deps, deps)) Object.assign(cell, { value: factory(), deps });
  return cell.value;
}

jest.unstable_mockModule('react', () => ({
  useState(initial) {
    const cell = slot(() => ({ value: initial }));
    cell.set ??= next => {
      cell.value = typeof next === 'function' ? next(cell.value) : next;
    };
    return [cell.value, cell.set];
  },
  useRef: initial => slot(() => ({ current: initial })),
  useCallback: (fn, deps) => useMemoized(() => fn, deps),
  useEffect(effect, deps) {
    const cell = slot(() => ({}));
    if (sameDeps(cell.deps, deps)) return;
    cell.deps = deps;
    fiber.effects.push(effect);
  },
}));
jest.unstable_mockModule('next/navigation', () => ({
  useSearchParams: () => new URL(window.location.href).searchParams,
}));
jest.unstable_mockModule('@/hooks/useDebounce', () => ({ useDebounce: value => value }));
jest.unstable_mockModule('@/hooks/useLocalStorage', () => ({
  // 실제 훅의 setter처럼 렌더 간 참조가 고정돼야 마운트 effect가 한 번만 돈다.
  useLocalStorage(_key, initial) {
    const cell = slot(() => ({ value: initial }));
    cell.set ??= next => {
      cell.value = next;
    };
    return [cell.value, cell.set];
  },
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

const { useIngredientManagePageState } =
  await import('../../app/ingredient/manage/useIngredientManagePageState.js');
const { IngredientManageViewUrlSync } =
  await import('../../app/ingredient/manage/IngredientManageViewUrlSync.js');

const originalWindow = globalThis.window;
const PATH = 'http://localhost/ingredient/manage';

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

// page.jsx처럼 상태 훅 + URL 구독 컴포넌트를 함께 마운트한다.
function mountPage(search = '') {
  window.location.href = PATH + search;
  const page = createFiber();
  const sync = createFiber();
  let state;

  const render = () => {
    state = renderInto(page, useIngredientManagePageState);
    renderInto(sync, () => IngredientManageViewUrlSync({ onViewParam: state.syncViewFromUrl }));
    // React와 같이 자식 effect가 부모보다 먼저 실행된다.
    const effects = [...sync.effects.splice(0), ...page.effects.splice(0)];
    effects.forEach(effect => effect());
    if (effects.length > 0) render();
  };
  render();

  return {
    get state() {
      return state;
    },
    act(change) {
      change(state);
      render();
    },
    // 클라이언트 이동: 리마운트 없이 주소만 바뀐다.
    navigate(nextSearch) {
      window.location.href = PATH + nextSearch;
      render();
    },
  };
}

beforeEach(() => {
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
      },
    },
  };
});

afterAll(() => {
  globalThis.window = originalWindow;
});

describe('식자재관리 탭 — 주소의 view 동기화', () => {
  test('처음 진입할 때 주소의 view로 탭을 연다', () => {
    expect(mountPage('?view=issues').state.view).toBe('issues');
  });

  test('화면에 머문 채 view=issues로 이동하면 이슈 탭으로 바뀐다', () => {
    const page = mountPage();
    expect(page.state.view).toBe('manage');

    page.navigate('?view=issues');

    expect(page.state.view).toBe('issues');
    expect(window.location.href).toBe(`${PATH}?view=issues`);
  });

  test('view가 없어지거나 알 수 없는 값이면 목록 탭으로 돌아간다', () => {
    const page = mountPage('?view=issues');

    page.navigate('');
    expect(page.state.view).toBe('manage');

    page.navigate('?view=price');
    page.navigate('?view=bogus');
    expect(page.state.view).toBe('manage');
  });

  test('탭을 클릭해 목록으로 옮긴 뒤에도 같은 링크로 다시 이슈 탭이 열린다', () => {
    const page = mountPage('?view=issues');

    page.act(state => state.setView('manage'));
    expect(page.state.view).toBe('manage');
    expect(window.location.href).toBe(PATH);

    page.navigate('?view=issues');
    expect(page.state.view).toBe('issues');
  });

  test('탭이 바뀌어도 검색어·분류·태그·열린 폼은 유지한다', () => {
    const page = mountPage();
    page.act(state => {
      state.setSearch('치즈');
      state.setCatFilter('유제품');
      state.setTagFilter('냉장');
      state.setFormTarget('new');
    });

    page.navigate('?view=issues');

    expect(page.state).toMatchObject({
      view: 'issues',
      search: '치즈',
      catFilter: '유제품',
      tagFilter: '냉장',
      formTarget: 'new',
    });
  });

  test('page는 URL 구독 컴포넌트만 Suspense 경계 안에 렌더한다', () => {
    const source = readFileSync(resolve('app/ingredient/manage/page.jsx'), 'utf8');
    expect(source).toMatch(
      /<Suspense fallback=\{null\}>\s*<IngredientManageViewUrlSync onViewParam=\{pageState\.syncViewFromUrl\} \/>\s*<\/Suspense>/
    );
  });
});
