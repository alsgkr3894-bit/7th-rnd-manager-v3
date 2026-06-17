import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(process.cwd(), 'app/ingredient/manage/IngredientSettingsPanel.jsx'),
  'utf-8'
);

const pageSrc = readFileSync(
  resolve(process.cwd(), 'app/ingredient/manage/page.jsx'),
  'utf-8'
);

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
