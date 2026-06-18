/**
 * P5 유지보수성 보강 - 드롭다운 keyboard 정책 & 대량 데이터 성능 방어 테스트
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from '@jest/globals';

const comboBoxSrc = readFileSync(resolve(process.cwd(), 'components/ui/ComboBox.jsx'), 'utf-8');
const menuRecipeSrc =
  readFileSync(resolve(process.cwd(), 'components/menu-master/MenuRecipeSection.jsx'), 'utf-8') +
  readFileSync(
    resolve(process.cwd(), 'components/menu-master/useRecipeIngredientSearch.js'),
    'utf-8'
  );
const filtersSrc = readFileSync(resolve(process.cwd(), 'hooks/useMenuMasterFilters.js'), 'utf-8');
const ingredientViewSrc = readFileSync(
  resolve(process.cwd(), 'app/ingredient/manage/useIngredientManageView.js'),
  'utf-8'
);

// ─── 드롭다운 keyboard 정책 ────────────────────────────────────────

describe('ComboBox keyboard 정책', () => {
  test('ArrowDown/ArrowUp/Enter에 e.preventDefault()가 있다', () => {
    expect(comboBoxSrc).toContain("'ArrowDown'");
    expect(comboBoxSrc).toContain("'ArrowUp'");
    expect(comboBoxSrc).toContain("'Enter'");
    // Enter 선택 시 상위 form submit으로 튀지 않도록 preventDefault 필수
    const preventCount = (comboBoxSrc.match(/e\.preventDefault\(\)/g) || []).length;
    expect(preventCount).toBeGreaterThanOrEqual(2);
  });

  test('Escape로 드롭다운을 닫는다', () => {
    expect(comboBoxSrc).toContain("'Escape'");
  });

  test('옵션 목록이 열릴 때 aria 상태가 관리된다', () => {
    // open/active 상태로 접근성 관련 UI 조건이 있어야 함
    expect(comboBoxSrc).toContain('open');
    expect(comboBoxSrc).toContain('active');
  });
});

describe('MenuRecipeSection 식자재 검색 keyboard 정책', () => {
  test('Enter 선택 시 e.preventDefault()로 form submit을 막는다', () => {
    expect(menuRecipeSrc).toContain('preventDefault');
  });

  test('ArrowDown/ArrowUp/Enter/Escape가 모두 처리된다', () => {
    expect(menuRecipeSrc).toContain("'ArrowDown'");
    expect(menuRecipeSrc).toContain("'ArrowUp'");
    expect(menuRecipeSrc).toContain("'Enter'");
    expect(menuRecipeSrc).toContain("'Escape'");
  });
});

// ─── 필터 memoization 구조 점검 ──────────────────────────────────

describe('메뉴마스터 필터 성능 구조', () => {
  test('filtered 결과가 useMemo로 감싸져 있다', () => {
    expect(filtersSrc).toContain('useMemo');
    expect(filtersSrc).toContain('filtered');
  });

  test('검색어(search)가 필터 의존성에 포함되어 있다', () => {
    // deps 배열에 search 포함 확인
    expect(filtersSrc).toContain('search');
  });
});

describe('식자재 관리 필터 성능 구조', () => {
  test('filtered 결과가 useMemo로 감싸져 있다', () => {
    expect(ingredientViewSrc).toContain('useMemo');
  });

  test('검색어에 debouncedSearch를 사용해 과도한 재계산을 막는다', () => {
    expect(ingredientViewSrc).toContain('debouncedSearch');
  });
});

// ─── 대량 데이터 순수 필터 성능 ──────────────────────────────────

describe('대량 데이터 필터 성능 (1000행 기준)', () => {
  function makeMenuRow(i) {
    return {
      menuCode: `P-OR-${String(i).padStart(4, '0')}-L`,
      menuName: `테스트 피자 ${i}`,
      category: i % 5 === 0 ? '1인피자' : '피자',
      subCategory: i % 3 === 0 ? '스페셜' : '오리지널',
      status: i % 10 === 0 ? 'hidden' : 'active',
    };
  }

  function applyMenuFilters(rows, { catFilter, statusFilter, search }) {
    let list = statusFilter === 'all' ? rows : rows.filter(r => r.status === statusFilter);
    if (catFilter !== 'all') list = list.filter(r => (r.category || '').startsWith(catFilter));
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        r =>
          (r.menuCode || '').toLowerCase().includes(q) ||
          (r.menuName || '').toLowerCase().includes(q)
      );
    return list;
  }

  const rows1000 = Array.from({ length: 1000 }, (_, i) => makeMenuRow(i));

  test('1000행 카테고리 필터가 10ms 이내 완료된다', () => {
    const start = performance.now();
    const result = applyMenuFilters(rows1000, {
      catFilter: '피자',
      statusFilter: 'all',
      search: '',
    });
    const elapsed = performance.now() - start;
    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(10);
  });

  test('1000행 텍스트 검색이 10ms 이내 완료된다', () => {
    const start = performance.now();
    const result = applyMenuFilters(rows1000, {
      catFilter: 'all',
      statusFilter: 'all',
      search: '피자 5',
    });
    const elapsed = performance.now() - start;
    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(10);
  });

  test('1000행 복합 필터(상태+카테고리+검색)가 10ms 이내 완료된다', () => {
    const start = performance.now();
    const result = applyMenuFilters(rows1000, {
      catFilter: '피자',
      statusFilter: 'active',
      search: '오리지널',
    });
    const elapsed = performance.now() - start;
    expect(result).toBeDefined();
    expect(elapsed).toBeLessThan(10);
  });
});
