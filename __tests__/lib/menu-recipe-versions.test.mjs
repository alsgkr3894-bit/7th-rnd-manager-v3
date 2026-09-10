import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { diffRecipeVersions } from '../../lib/menu-master/recipe-versions.js';
import { DB_VERSION, ALL_STORES } from '../../lib/db/constants.js';

const src = f => readFileSync(resolve(f), 'utf8');

describe('menu_recipe_versions 스키마 배선', () => {
  test('ALL_STORES에 menu_recipe_versions가 있다', () => {
    expect(ALL_STORES).toContain('menu_recipe_versions');
  });

  test('DB_VERSION이 27 이상이다(신규 store 추가)', () => {
    expect(DB_VERSION).toBeGreaterThanOrEqual(27);
  });

  test('schema/menu-master.js가 menu_recipe_versions store를 만든다', () => {
    const s = src('lib/db/schema/menu-master.js');
    expect(s).toContain("createObjectStore('menu_recipe_versions'");
    expect(s).toContain("createIndex('menuCode'");
    expect(s).toContain("createIndex('at'");
  });

  test('cost 백업 그룹에 menu_recipe_versions가 포함된다(menu_recipes와 함께)', () => {
    const s = src('lib/db/module-stores.js');
    const costGroupStart = s.indexOf('cost: {');
    const costGroupBody = s.slice(costGroupStart, costGroupStart + 400);
    expect(costGroupBody).toContain('menu_recipes');
    expect(costGroupBody).toContain('menu_recipe_versions');
  });
});

describe('diffRecipeVersions', () => {
  test('추가/삭제/변경된 구성품을 구분한다', () => {
    const before = {
      totalCost: 1000,
      components: [
        { productCode: 'A', ingredientName: '치즈', quantity: 10, unitPrice: 50 },
        { productCode: 'B', ingredientName: '도우', quantity: 1, unitPrice: 500 },
      ],
    };
    const after = {
      totalCost: 1200,
      components: [
        { productCode: 'A', ingredientName: '치즈', quantity: 15, unitPrice: 50 }, // 수량 변경
        { productCode: 'C', ingredientName: '토마토소스', quantity: 1, unitPrice: 100 }, // 추가
        // B(도우)는 삭제됨
      ],
    };
    const diff = diffRecipeVersions(before, after);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].ingredientName).toBe('토마토소스');
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0].ingredientName).toBe('도우');
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].label).toBe('치즈');
    expect(diff.changed[0].before.quantity).toBe(10);
    expect(diff.changed[0].after.quantity).toBe(15);
    expect(diff.costDelta).toBe(200);
  });

  test('구성품이 완전히 같으면 변경 없음으로 판정한다', () => {
    const same = {
      totalCost: 500,
      components: [{ productCode: 'A', ingredientName: '치즈', quantity: 10, unitPrice: 50 }],
    };
    const diff = diffRecipeVersions(same, same);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
    expect(diff.costDelta).toBe(0);
  });

  test('원가 정보가 없으면 costDelta는 null이다', () => {
    const diff = diffRecipeVersions({ components: [] }, { components: [] });
    expect(diff.costDelta).toBeNull();
  });
});

describe('레시피 저장 시 버전 스냅샷을 남긴다', () => {
  test('useMenuRecipeEditor.handleSave가 saveRecipeVersionSnapshot을 호출한다', () => {
    const s = src('components/menu-master/useMenuRecipeEditor.js');
    expect(s).toContain("from '@/lib/menu-master/recipe-versions'");
    expect(s).toContain('saveRecipeVersionSnapshot({');
    // 부수 기록이라 실패해도 저장 자체를 막지 않는다 — throw 대신 catch로 삼킨다
    expect(s).toMatch(/saveRecipeVersionSnapshot\(\{[\s\S]*?\}\)\.catch/);
  });

  test('MenuRecipeSection이 변경 이력 UI를 렌더한다', () => {
    const s = src('components/menu-master/MenuRecipeSection.jsx');
    expect(s).toContain('MenuRecipeVersionHistory');
    expect(s).toContain('currentTotalCost={recipeSummary?.totalCost}');
  });
});

describe('중분류 변경 시 레시피 구성품이 삭제되던 버그 — 조회/저장 키 분리', () => {
  test('useMenuRecipeEditor가 sourceMenuCode(모달 오픈 시점 원래 코드)로 조회한다', () => {
    const s = src('components/menu-master/useMenuRecipeEditor.js');
    expect(s).toContain('sourceMenuCode');
    expect(s).toContain('const loadMenuCode = sourceMenuCode || menuCode;');
    // 조회는 loadMenuCode(고정된 원래 코드) 기준이어야 한다 — menuCode를 그대로 쓰면
    // 중분류 변경으로 코드가 바뀌는 순간 아직 저장 안 된 새 코드로 재조회해 빈 배열이 된다.
    expect(s).toContain('getMenuRecipeForMenu({ menuCode: loadMenuCode');
    expect(s).toContain('}, [loadMenuCode, category]);');
    // 저장은 (캐스케이드로 이미 옮겨진) 현재 menuCode 기준이어야 한다.
    expect(s).toMatch(/upsertMenuRecipeForMenu\(\{\s*menuCode,/);
  });

  test('MenuRecipeSection·MenuMasterEditFields가 sourceMenuCode를 그대로 전달한다', () => {
    const section = src('components/menu-master/MenuRecipeSection.jsx');
    expect(section).toContain('sourceMenuCode,');
    expect(section).toMatch(/useMenuRecipeEditor\(\{[\s\S]*?sourceMenuCode,/);

    const fields = src('components/menu-master/MenuMasterEditFields.jsx');
    // row는 모달이 열릴 때의 원본 DB 행(수정 중 안 바뀜) — form.menuCode가 아니라
    // 이 값을 넘겨야 편집 도중 코드가 바뀌어도 조회 키가 흔들리지 않는다.
    expect(fields).toContain('sourceMenuCode={row?.menuCode || form.menuCode}');
  });

  test('지원하지 않는 카테고리는 조용히 사라지는 대신 안내 문구를 보여준다', () => {
    const s = src('components/menu-master/MenuRecipeSection.jsx');
    expect(s).not.toMatch(/if \(!supported\) return null;/);
    expect(s).toContain('이 카테고리는 레시피 원가를 지원하지 않습니다');
  });

  test('메뉴코드 캐스케이드가 menu_recipes의 kind도 새 카테고리 기준으로 갱신한다', () => {
    const s = src('lib/menu-master/store.js');
    expect(s).toContain("from '@/lib/recipe-master/sync'");
    expect(s).toMatch(
      /if \('kind' in row\) next\.kind = recipeStoreKindForCategory\(next\.category\) \|\| row\.kind;/
    );
  });
});

describe('고아 레시피 스냅샷 감지·복구', () => {
  test('findOrphanRecipeVersions가 메뉴 소멸 또는 구성품 0건 기준으로 고른다', () => {
    const s = src('lib/menu-master/recipe-versions.js');
    expect(s).toContain('export async function findOrphanRecipeVersions()');
    expect(s).toContain('!stillLinkedToMenu || currentComponentCount === 0');
    // 활성 브랜드가 아닌 스냅샷은 섞이지 않아야 한다.
    expect(s).toContain('v.brandId !== activeBrandId');
  });

  test('restoreRecipeFromVersion은 메뉴마스터에 남아있는 메뉴만 복구를 허용한다', () => {
    const s = src('lib/menu-master/recipe-versions.js');
    expect(s).toContain('export async function restoreRecipeFromVersion(version)');
    expect(s).toContain('메뉴마스터에서 이 메뉴를 찾을 수 없습니다');
  });

  test('메뉴마스터 페이지에 복구 배너가 뷰어 제외하고 연결돼 있다', () => {
    const banner = src('components/menu-master/MenuRecipeOrphanBanner.jsx');
    expect(banner).toContain('findOrphanRecipeVersions');
    expect(banner).toContain('restoreRecipeFromVersion');
    expect(banner).toContain('if (isViewer || loading || safeOrphans.length === 0) return null;');

    const page = src('app/menu-master/page.jsx');
    expect(page).toContain("from '@/components/menu-master/MenuRecipeOrphanBanner'");
    expect(page).toContain('<MenuRecipeOrphanBanner isViewer={isViewer} />');
  });
});
