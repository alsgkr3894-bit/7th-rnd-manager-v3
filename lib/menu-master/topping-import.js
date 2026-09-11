/**
 * lib/menu-master/topping-import.js — 영양 토핑 마스터(nutrition_topping_master)를
 * 메뉴마스터 추가토핑 메뉴로 일괄 등록하기 위한 계획 생성.
 *
 * 토핑↔식자재 연결은 이미 영양 토핑 마스터에 큐레이션돼 있지만 사용량·판매가는
 * 없다 — 여기서는 "메뉴로 등록"까지만 하고, 사용량은 메뉴마스터의 기존 레시피
 * 에디터에서, 판매가는 등록 후 메뉴마스터에서 입력한다.
 */
import { generateMenuCode } from '@/lib/cost/menu-price';
import { MENU_CATEGORY } from '@/lib/menu-categories';

/**
 * 영양 토핑 마스터 행의 표시명. nutrition_topping_master(toppingCode)와
 * menu_master 추가토핑(T-ETC-NNN)은 서로 다른 코드 체계라 이 이름으로만 이어진다
 * — buildToppingImportPlan(멱등 판정)과 topping-recipe-prefill.js(식자재 연결)가
 * 반드시 같은 규칙을 써야 한다.
 */
export function toppingDisplayName(topping) {
  return String(topping?.toppingName || topping?.ingredientName || '').trim();
}

/**
 * @param {Array} toppings - getAllToppings() 결과
 * @param {Array} existingMenus - getAllMenuMaster() 결과
 * @returns {Array<{menuCode, menuName, category, size, status, price, source}>}
 *   이미 추가토핑으로 등록된 이름은 제외한 신규 등록분만 반환(멱등 — 몇 번을
 *   실행해도 같은 토핑을 중복 등록하지 않는다).
 */
export function buildToppingImportPlan(toppings, existingMenus) {
  const existingRows = Array.isArray(existingMenus) ? existingMenus : [];
  const existingToppingNames = new Set(
    existingRows
      .filter(m => m?.category === MENU_CATEGORY.EXTRA_TOPPING)
      .map(m => String(m?.menuName || '').trim())
      .filter(Boolean)
  );

  const seen = new Set();
  const names = (Array.isArray(toppings) ? toppings : []).map(toppingDisplayName).filter(name => {
    if (!name || existingToppingNames.has(name) || seen.has(name)) return false;
    seen.add(name);
    return true;
  });

  // generateMenuCode는 existingRecords 안에서 같은 prefix의 최대 번호 다음을 붙인다.
  // 배치 내에서 만든 코드도 다음 항목의 existingRecords에 계속 누적해야
  // T-ETC-001, T-ETC-002 ... 순으로 겹치지 않게 이어진다.
  const accum = existingRows.map(m => ({ menuCode: m.menuCode }));
  return names.map(menuName => {
    const menuCode = generateMenuCode(
      { category: MENU_CATEGORY.EXTRA_TOPPING, size: '단일', menuName },
      accum
    );
    accum.push({ menuCode });
    return {
      menuCode,
      menuName,
      category: MENU_CATEGORY.EXTRA_TOPPING,
      size: '단일',
      status: 'active',
      price: null,
      source: 'topping-import',
    };
  });
}
