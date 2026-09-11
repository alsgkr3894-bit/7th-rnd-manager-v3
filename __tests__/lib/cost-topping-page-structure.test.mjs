import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

const pageSource = src('app/cost/topping/page.jsx');
const tableSource = src('components/cost/topping/ToppingCostTable.jsx');
const routesSource = src('lib/cost/routes.js');
const hubSource = src('app/cost/page.jsx');
const routeClassificationSource = src('lib/navigation/route-classification.js');

describe('추가토핑 원가 페이지 배선', () => {
  test('lib/cost/routes.js에 COST_TOPPING_ROUTE가 있다', () => {
    expect(routesSource).toContain("export const COST_TOPPING_ROUTE = '/cost/topping';");
  });

  test('원가계산 허브 카드에 추가토핑 원가가 연결돼 있다', () => {
    expect(hubSource).toContain('COST_TOPPING_ROUTE');
    expect(hubSource).toContain('추가토핑 원가');
  });

  test('route-classification에 /cost/topping이 등록돼 있다(누락 시 route-classification.test.mjs가 깨진다)', () => {
    expect(routeClassificationSource).toContain("'/cost/topping'");
  });

  test('페이지가 menu_master 저장 뒤 cost_selling_prices 미러(pushMasterToPrices)를 호출한다', () => {
    // menu_master → menu_recipes 순서를 지켜야 코드 변경 캐스케이드가 레시피를 덮어쓰지 않는다
    // (item 1의 데이터 손실 버그와 같은 종류의 함정).
    expect(pageSource).toContain('buildToppingMenuPatch(row, changes)');
    expect(pageSource).toContain('await upsertMenuMaster(patch)');
    expect(pageSource).toContain('pushMasterToPrices({ skipAdminGuard: true })');
  });

  test('메뉴 저장·삭제가 자동 일지(work_log)에도 기록된다', () => {
    expect(pageSource).toContain("import { logWork } from '@/lib/work-log'");
    expect(pageSource).toContain('summarizeMenuMasterChange');
    expect(pageSource).toContain("logWork('MENU_MASTER'");
    expect(pageSource).toContain("logWork('DELETE'");
  });

  test('레시피(식자재·수량) 저장은 menu_recipes만 건드리고 판매가 미러를 다시 부르지 않는다', () => {
    const recipeSaveBlock = pageSource.slice(
      pageSource.indexOf('handleRecipeSave'),
      pageSource.indexOf('handleDeleteRow')
    );
    expect(recipeSaveBlock).toContain('upsertMenuRecipeForMenu(buildToppingRecipePatch(row');
    expect(recipeSaveBlock).not.toContain('pushMasterToPrices');
  });

  test('행 추가는 getAllMenuMaster를 다시 읽어 generateMenuCode 코드 충돌을 피한다', () => {
    const addRowBlock = pageSource.slice(
      pageSource.indexOf('handleAddRow'),
      pageSource.indexOf('handlePrefill')
    );
    expect(addRowBlock).toContain('const existingMenus = await getAllMenuMaster();');
    expect(addRowBlock).toContain('generateMenuCode(');
  });

  test('토핑마스터 불러오기 버튼은 buildToppingRecipePrefillPlan을 재사용한다(새 매칭 로직 금지)', () => {
    expect(pageSource).toContain("from '@/lib/menu-master/topping-recipe-prefill'");
    expect(pageSource).toContain(
      'buildToppingRecipePrefillPlan(toppings, menus, recipeMaps.topping, unitPriceMap)'
    );
  });

  test('표는 기존 IngredientSearch·InlineEditCell을 재사용한다(새 검색 UI 재구현 금지)', () => {
    expect(tableSource).toContain("from '@/components/cost/shared/IngredientSearch'");
    expect(tableSource).toContain("from '@/components/cost/manage/table-utils'");
  });

  test('원가·원가율은 lib/cost/topping/rows.js가 계산하고 페이지가 재구현하지 않는다', () => {
    expect(pageSource).not.toContain('effectiveComponentsCost');
    expect(pageSource).not.toContain('calcCostRate');
    expect(pageSource).toContain('buildToppingCostRows');
  });
});
