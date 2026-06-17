import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const filtersSrc = readFileSync(resolve('app/cost/margin/useMarginFilters.js'), 'utf-8');
const actionsSrc = readFileSync(resolve('app/cost/margin/useMarginActions.js'), 'utf-8');
const pageSrc = readFileSync(resolve('app/cost/margin/page.jsx'), 'utf-8');

describe('margin 훅 분리 구조', () => {
  test('useMarginFilters.js가 catFilter/search/sortKey/showHidden 상태를 관리한다', () => {
    expect(filtersSrc).toContain('catFilter');
    expect(filtersSrc).toContain('search');
    expect(filtersSrc).toContain('sortKey');
    expect(filtersSrc).toContain('showHidden');
  });

  test('useMarginFilters.js가 stats/sortedFiltered/hiddenCount를 반환한다', () => {
    expect(filtersSrc).toContain('stats');
    expect(filtersSrc).toContain('sortedFiltered');
    expect(filtersSrc).toContain('hiddenCount');
  });

  test('useMarginFilters.js가 handleSort로 방향을 토글한다', () => {
    // sortKey === key면 방향 토글, 아니면 새 key로 변경
    expect(filtersSrc).toContain("'asc' ? 'desc' : 'asc'");
  });

  test('useMarginActions.js가 handleSaveSnapshot/handleSavePlatforms/handleToggleHide를 반환한다', () => {
    expect(actionsSrc).toContain('handleSaveSnapshot');
    expect(actionsSrc).toContain('handleSavePlatforms');
    expect(actionsSrc).toContain('handleToggleHide');
  });

  test('useMarginActions.js가 showToast로 성공/실패를 노출한다', () => {
    expect(actionsSrc).toContain('showToast');
    expect(actionsSrc).toContain("'ok'");
    expect(actionsSrc).toContain("'error'");
  });

  test('page.jsx가 두 훅을 import한다', () => {
    expect(pageSrc).toContain("from './useMarginFilters'");
    expect(pageSrc).toContain("from './useMarginActions'");
  });

  test('page.jsx에 sortedFiltered/stats/handleSort 직접 구현이 없다', () => {
    expect(pageSrc).not.toContain('const sortedFiltered = useMemo');
    expect(pageSrc).not.toContain('const stats = useMemo');
    expect(pageSrc).not.toContain('function handleSort(');
  });
});
