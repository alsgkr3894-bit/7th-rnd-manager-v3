import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(process.cwd(), 'app/ingredient/manage/IngredientSettingsPanel.jsx'),
  'utf-8'
);

const pageSrc = readFileSync(resolve(process.cwd(), 'app/ingredient/manage/page.jsx'), 'utf-8');

describe('IngredientSettingsPanel 구조 검증', () => {
  test("'use client' 선언이 있다", () => {
    expect(src).toContain("'use client'");
  });

  test('useState를 import한다', () => {
    expect(src).toContain('useState');
  });

  test('요약(SummaryChip) 컴포넌트가 있다', () => {
    expect(src).toContain('SummaryChip');
  });

  test('분류, 태그, 미분류, 단종 요약 칩을 렌더한다', () => {
    expect(src).toContain('label="분류"');
    expect(src).toContain('label="태그"');
    expect(src).toContain('label="미분류"');
    expect(src).toContain('label="단종"');
  });

  test('정리 후보(CleanupBadge) 컴포넌트가 있다', () => {
    expect(src).toContain('CleanupBadge');
    expect(src).toContain('정리 후보');
  });

  test('사용량 0개 항목에 CleanupBadge를 표시하는 조건이 있다', () => {
    expect(src).toContain('count === 0');
  });

  test('분류 검색 입력 상태(catSearch)가 있다', () => {
    expect(src).toContain('catSearch');
  });

  test('태그 검색 입력 상태(tagSearch)가 있다', () => {
    expect(src).toContain('tagSearch');
  });

  test('SearchInput 컴포넌트가 있다', () => {
    expect(src).toContain('SearchInput');
  });

  test('분류 섹션과 태그 섹션이 divider로 분리되어 있다', () => {
    const dividerMatches = (src.match(/var\(--divider\)/g) || []).length;
    expect(dividerMatches).toBeGreaterThanOrEqual(2);
  });

  test('uncategorized와 discontinuedCount prop을 받는다', () => {
    expect(src).toContain('uncategorized');
    expect(src).toContain('discontinuedCount');
  });

  test('삭제 안내 문구가 있다', () => {
    expect(src).toContain('식자재 자체는 유지');
  });
});

describe('page.jsx - IngredientSettingsPanel에 uncategorized/discontinuedCount 전달', () => {
  // IngredientSettingsPanel 렌더 블록 추출 (rows.length > 0 && view === 'settings')
  function getSettingsBlock() {
    const marker = "view === 'settings' && (";
    // 마지막으로 등장하는 settings view 블록(IngredientSettingsPanel)을 찾는다
    const lastIdx = pageSrc.lastIndexOf(marker);
    return lastIdx >= 0 ? pageSrc.slice(lastIdx, lastIdx + 600) : '';
  }

  test('settings 뷰에서 uncategorized를 IngredientSettingsPanel에 전달한다', () => {
    expect(getSettingsBlock()).toContain('uncategorized');
  });

  test('settings 뷰에서 discontinuedCount를 IngredientSettingsPanel에 전달한다', () => {
    expect(getSettingsBlock()).toContain('discontinuedCount');
  });
});

describe('단가 없음 필터 (NO_PRICE_FILTER)', () => {
  const constantsSrc = readFileSync(resolve(process.cwd(), 'lib/ingredient/constants.js'), 'utf-8');
  const manageViewSrc = readFileSync(
    resolve(process.cwd(), 'app/ingredient/manage/useIngredientManageView.js'),
    'utf-8'
  );
  const managePanelSrc = readFileSync(
    resolve(process.cwd(), 'app/ingredient/manage/IngredientManagePanel.jsx'),
    'utf-8'
  );

  test('constants.js에 NO_PRICE_FILTER sentinel이 정의되어 있다', () => {
    expect(constantsSrc).toContain("NO_PRICE_FILTER = '__no_price__'");
  });

  test('useIngredientManageView가 NO_PRICE_FILTER를 import한다', () => {
    expect(manageViewSrc).toContain('NO_PRICE_FILTER');
  });

  test('useIngredientManageView가 noPriceCount를 계산한다', () => {
    expect(manageViewSrc).toContain('noPriceCount');
    expect(manageViewSrc).toContain('unitPrice == null');
  });

  test('useIngredientManageView가 NO_PRICE_FILTER 케이스를 filtered에 처리한다', () => {
    expect(manageViewSrc).toContain('NO_PRICE_FILTER');
    // filter logic에서 unitPrice == null로 필터링
    const idx1 = manageViewSrc.indexOf('NO_PRICE_FILTER');
    const idx2 = manageViewSrc.indexOf('unitPrice == null', idx1);
    expect(idx2).toBeGreaterThan(idx1);
  });

  test('IngredientManagePanel이 noPriceCount prop을 받는다', () => {
    expect(managePanelSrc).toContain('noPriceCount');
  });

  test('IngredientManagePanel이 단가 없음 칩을 렌더한다', () => {
    expect(managePanelSrc).toContain('단가 없음');
    expect(managePanelSrc).toContain('NO_PRICE_FILTER');
  });
});
