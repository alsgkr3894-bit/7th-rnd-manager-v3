import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

/**
 * 레시피 구성품 드래그 순서변경(레시피출력 순서용) 배선 확인.
 * lib/report/recipe-print-rows.js가 components 배열 순서로 lineNo를 매기므로
 * 여기서 배열 순서만 바꾸면 충분하다 — 별도 sortOrder 필드는 없다.
 */
describe('레시피 구성품 드래그 순서변경', () => {
  test('MenuRecipeSection이 _key 기준으로 components 배열을 재정렬한다', () => {
    const s = src('components/menu-master/MenuRecipeSection.jsx');
    expect(s).toContain('const handleReorderRows');
    expect(s).toContain('prev.findIndex(c => c._key === activeKey)');
    expect(s).toContain('prev.findIndex(c => c._key === overKey)');
    expect(s).toContain('onReorderRows={handleReorderRows}');
    expect(s).toContain('reorderDisabled={onlyMissingPrice}');
  });

  test('MenuRecipeComponentsTable은 dnd-kit로 감싸고 필터 중엔 비활성화한다', () => {
    const s = src('components/menu-master/MenuRecipeComponentsTable.jsx');
    expect(s).toContain("from '@dnd-kit/core'");
    expect(s).toContain("from '@dnd-kit/sortable'");
    expect(s).toContain('const canReorder = typeof onReorderRows');
    expect(s).toContain('!reorderDisabled');
    expect(s).toContain('items={components.map(c => c._key)}');
  });

  test('MenuRecipeTableRow은 dragHandleId가 있을 때만 useSortable을 활성화한다', () => {
    const s = src('components/menu-master/recipe/MenuRecipeTableRow.jsx');
    expect(s).toContain("from '@dnd-kit/sortable'");
    expect(s).toContain('disabled: !dragHandleId');
    expect(s).toContain('드래그로 순서 변경');
  });
});
