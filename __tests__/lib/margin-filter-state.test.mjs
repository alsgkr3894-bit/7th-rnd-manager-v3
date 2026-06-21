import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildMarginTableSections } from '../../app/cost/margin/marginTableSections.js';

const filtersSrc = readFileSync(resolve('app/cost/margin/useMarginFilters.js'), 'utf-8');
const actionsSrc = readFileSync(resolve('app/cost/margin/useMarginActions.js'), 'utf-8');
const pageSrc = readFileSync(resolve('app/cost/margin/page.jsx'), 'utf-8');
const tableCardSrc = readFileSync(resolve('app/cost/margin/_MarginTableCard.jsx'), 'utf-8');
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

  test('원가마진표는 카테고리별 표 섹션으로 나눈다', () => {
    expect(pageSrc).toContain('buildMarginTableSections(paged)');
    // 섹션 렌더링은 _MarginTableCard로 이동
    expect(tableCardSrc).toContain('section.sizeLabels');
    expect(tableCardSrc).toContain('margin-section-header');
    expect(tableCardSrc).toContain('margin-section-marker');
    expect(tableSectionsSrc).toContain("title: '피자'");
    expect(tableSectionsSrc).toContain("title: '세트박스'");
    expect(tableSectionsSrc).toContain("title: '사이드'");
  });

  test('buildMarginTableSections는 카테고리별로 나누고 피자 표에서 단일 컬럼을 제외한다', () => {
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

    expect(sections).toHaveLength(3);
    expect(sections[0]).toMatchObject({
      id: 'pizza',
      title: '피자',
      sizeLabels: ['L', 'R'],
    });
    expect(sections[0].rows.map(row => row.menuName)).toEqual(['피자']);
    expect(sections[0].sizeLabels).not.toContain('단일');
    expect(sections[1]).toMatchObject({
      id: 'set',
      title: '세트박스',
      sizeLabels: ['L'],
    });
    expect(sections[1].rows.map(row => row.menuName)).toEqual(['세트박스']);
    expect(sections[2]).toMatchObject({
      id: 'side',
      title: '사이드',
      sizeLabels: ['단일'],
    });
    expect(sections[2].rows[0].sizes).toEqual([{ label: '단일', sellingPrice: 5000 }]);
    expect(sections[2].rows[0].costMap.단일).toBe(1500);
  });

  // H-1 회귀: 단일 카테고리 행에 비-L/R 사이즈가 여러 개면 모두 별도 행으로 보존돼야 한다.
  test('단일 카테고리의 다중 사이즈는 사이즈별 행으로 분리되어 소실되지 않는다', () => {
    const sections = buildMarginTableSections([
      {
        id: 'drink',
        menuName: '콜라',
        menuCategory: '음료',
        sizes: [
          { label: '소', sellingPrice: 2000 },
          { label: '대', sellingPrice: 3500 },
        ],
        costMap: { 소: 800, 대: 1400 },
      },
    ]);

    expect(sections).toHaveLength(1);
    const rows = sections[0].rows;
    expect(rows).toHaveLength(2); // 소/대 둘 다 보존
    // 두 행 모두 '단일' 컬럼으로 표시되며 각자 자기 가격/원가를 유지
    const priceByName = Object.fromEntries(
      rows.map(r => [r.menuName, { price: r.sizes[0].sellingPrice, cost: r.costMap.단일 }])
    );
    expect(priceByName['콜라 (소)']).toEqual({ price: 2000, cost: 800 });
    expect(priceByName['콜라 (대)']).toEqual({ price: 3500, cost: 1400 });
  });
});
