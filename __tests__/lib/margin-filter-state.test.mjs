import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildMarginTableSections } from '../../app/cost/margin/marginTableSections.js';

const filtersSrc = readFileSync(resolve('app/cost/margin/useMarginFilters.js'), 'utf-8');
const actionsSrc = readFileSync(resolve('app/cost/margin/useMarginActions.js'), 'utf-8');
const pageSrc = readFileSync(resolve('app/cost/margin/page.jsx'), 'utf-8');
const tableSectionsSrc = readFileSync(resolve('app/cost/margin/marginTableSections.js'), 'utf-8');

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

  test('원가마진표는 L/R 메뉴와 단일 메뉴를 별도 표 섹션으로 나눈다', () => {
    expect(pageSrc).toContain('buildMarginTableSections(paged)');
    expect(pageSrc).toContain('section.sizeLabels');
    expect(tableSectionsSrc).toContain('피자 · 세트박스');
    expect(tableSectionsSrc).toContain('단일 메뉴');
  });

  test('buildMarginTableSections는 피자 표에서 단일 컬럼을 제외한다', () => {
    const sections = buildMarginTableSections([
      {
        id: 'pizza',
        menuName: '피자',
        menuCategory: '피자/오리지널',
        sizes: [
          { label: 'L', sellingPrice: 20000 },
          { label: 'R', sellingPrice: 17000 },
        ],
        costMap: { L: 6000, R: 5000 },
      },
      {
        id: 'side',
        menuName: '사이드',
        menuCategory: '사이드',
        sizes: [{ label: '단품', sellingPrice: 5000 }],
        costMap: { 단품: 1500 },
      },
      {
        id: 'set',
        menuName: '세트박스',
        menuCategory: '세트박스',
        sizes: [{ label: 'L', sellingPrice: 30000 }],
        costMap: { L: 9000 },
      },
    ]);

    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({
      id: 'lr',
      sizeLabels: ['L', 'R'],
    });
    expect(sections[0].rows.map(row => row.menuName)).toEqual(['피자', '세트박스']);
    expect(sections[0].sizeLabels).not.toContain('단일');
    expect(sections[1]).toMatchObject({
      id: 'single',
      sizeLabels: ['단일'],
    });
    expect(sections[1].rows[0].sizes).toEqual([{ label: '단일', sellingPrice: 5000 }]);
    expect(sections[1].rows[0].costMap.단일).toBe(1500);
  });
});
