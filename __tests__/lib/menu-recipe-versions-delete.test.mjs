import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

// 2026-10-30: 복구 목록의 메뉴가 메뉴마스터에서 이미 삭제돼 복구가 막혀도 지울 방법이 없던 문제 —
// 복구 목록에서 이력을 지우는 기능(deleteRecipeVersionsForMenu)을 검증한다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

let rows = [];
const deleted = [];
const assertActiveAdmin = jest.fn(async () => {});
let brand = 'main';

jest.unstable_mockModule('@/lib/db', () => ({
  getAll: jest.fn(async () => rows),
  getByIndex: jest.fn(async (_store, _index, code) => rows.filter(r => r.menuCode === code)),
  hasStore: () => true,
  runTransaction: jest.fn(async (_stores, _mode, fn) =>
    fn({ objectStore: () => ({ delete: id => deleted.push(id), add: () => {} }) })
  ),
}));
jest.unstable_mockModule('@/lib/active-brand', () => ({ getActiveBrandId: () => brand }));
jest.unstable_mockModule('@/lib/auth/guard', () => ({ assertActiveAdmin }));
jest.unstable_mockModule('@/lib/menu-master/store', () => ({ getAllMenuMaster: async () => [] }));
jest.unstable_mockModule('@/lib/menu-recipes', () => ({
  getAllMenuRecipes: async () => [],
  upsertMenuRecipe: async () => {},
}));

const { deleteRecipeVersionsForMenu } = await import('../../lib/menu-master/recipe-versions.js');

beforeEach(() => {
  brand = 'main';
  deleted.length = 0;
  assertActiveAdmin.mockClear();
  rows = [
    { id: 1, menuCode: 'ZZZ-02', brandId: 'main' },
    { id: 2, menuCode: 'ZZZ-02' }, // 멀티브랜드 이전 행
    { id: 3, menuCode: 'ZZZ-02', brandId: 'other' }, // 다른 브랜드 — 건드리지 않는다
    { id: 4, menuCode: 'P-1-L', brandId: 'main' }, // 다른 메뉴
  ];
});

describe('deleteRecipeVersionsForMenu', () => {
  test('현재 브랜드의 그 메뉴 이력만 지우고 다른 메뉴·다른 브랜드는 남긴다', async () => {
    const result = await deleteRecipeVersionsForMenu(' ZZZ-02 ');
    expect(result).toEqual({ menuCode: 'ZZZ-02', deletedCount: 2 });
    expect(deleted.sort()).toEqual([1, 2]);
  });

  test('관리자 확인을 거치고, 거부되면 아무것도 지우지 않는다', async () => {
    assertActiveAdmin.mockRejectedValueOnce(new Error('권한 없음'));
    await expect(deleteRecipeVersionsForMenu('ZZZ-02')).rejects.toThrow('권한 없음');
    expect(deleted).toEqual([]);
  });

  test('코드가 비면 거부하고, 지울 이력이 없으면 0건이다', async () => {
    await expect(deleteRecipeVersionsForMenu('  ')).rejects.toThrow('menuCode');
    expect(await deleteRecipeVersionsForMenu('NONE')).toEqual({
      menuCode: 'NONE',
      deletedCount: 0,
    });
  });
});

describe('복구 목록 화면 연결', () => {
  test('복구 불가 항목에 안내와 [이력 삭제] 버튼·확인창이 있다', () => {
    const src = read('components/menu-master/MenuRecipeOrphanBanner.jsx');
    expect(src).toContain('deleteRecipeVersionsForMenu');
    expect(src).toContain('이력 삭제');
    expect(src).toContain('<ConfirmDialog');
    expect(src).toContain('복구할 수 없습니다');
  });
});
