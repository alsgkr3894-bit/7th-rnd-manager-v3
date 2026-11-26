/**
 * scripts/cost-baseline-core.mjs — 원가 기준값의 순수 계산·비교
 *
 * 수동 계산은 앱의 원가 함수를 쓰지 않는다: 원본 단가·포장수량·수량만으로 다시 곱한다.
 */
const num = value => (value === '' || value == null ? NaN : Number(value));
const text = value => String(value ?? '').trim();
const nameKey = value => text(value).replace(/\s/g, '');

/** 구성품에 해당하는 식자재 — 제품코드 우선, 코드 없는 구성품은 이름으로 */
export function findIngredient(line, ingredients) {
  const code = text(line.productCode);
  if (code) return ingredients.find(item => text(item.productCode) === code) || null;
  const name = nameKey(line.ingredientName);
  const matches = ingredients.filter(item => nameKey(item.ingredientName) === name);
  return matches.length === 1 ? matches[0] : null;
}

/** 포장 가격(부가세 포함): 최신 제때 단가, 없으면 식자재의 수동 단가. 합성 식자재는 구성품 합 */
export function packPriceOf(ingredient, latestPrices) {
  const parts = Array.isArray(ingredient.compositeOf) ? ingredient.compositeOf : [];
  if (text(ingredient.productCode) && parts.length > 0) {
    const prices = parts.map(code => num(latestPrices.get(text(code))));
    if (prices.every(price => price > 0)) return prices.reduce((sum, price) => sum + price, 0);
    return num(ingredient.priceOverride);
  }
  const jette = text(ingredient.productCode)
    ? num(latestPrices.get(text(ingredient.productCode)))
    : NaN;
  return jette > 0 ? jette : num(ingredient.priceOverride);
}

/**
 * 한 메뉴의 수동 원가.
 * exact: 반올림 없이, rounded: 단위 단가를 0.1원으로 반올림한 뒤(앱의 규칙) 합산
 */
export function manualMenuCost(components, ingredients, latestPrices) {
  let exact = 0;
  let rounded = 0;
  const lines = components.map(line => {
    const quantity = num(line.quantity);
    const ingredient = findIngredient(line, ingredients);
    const packPrice = ingredient ? packPriceOf(ingredient, latestPrices) : NaN;
    const packQuantity = ingredient ? num(ingredient.baseQuantity) : NaN;
    let unit = packPrice > 0 && packQuantity > 0 ? packPrice / packQuantity : NaN;
    let source = '식자재';
    if (!ingredient) {
      // 연결된 식자재가 없으면 레시피에 저장된 단가
      unit = num(line.storedUnitPrice);
      source = '레시피 저장 단가';
    }
    const usable = Number.isFinite(quantity) && Number.isFinite(unit);
    if (usable) {
      exact += quantity * unit;
      rounded += quantity * (ingredient ? Math.round(unit * 10) / 10 : unit);
    }
    return {
      name: text(line.ingredientName),
      productCode: text(line.productCode) || null,
      quantity: Number.isFinite(quantity) ? quantity : null,
      packPrice: Number.isFinite(packPrice) ? packPrice : null,
      packQuantity: Number.isFinite(packQuantity) ? packQuantity : null,
      unitPrice: Number.isFinite(unit) ? Math.round(unit * 10000) / 10000 : null,
      cost: usable ? Math.round(quantity * unit * 100) / 100 : null,
      source: usable ? source : '계산 불가',
    };
  });
  return {
    exact: Math.round(exact),
    rounded: Math.round(rounded),
    unresolved: lines.filter(line => line.cost == null).length,
    lines,
  };
}

/** 대표 메뉴 — 분류·규격마다 하나씩, 메뉴코드 순. 계산 불가 줄이 없는 메뉴만 */
export function pickRepresentatives(candidates, minimum = 5) {
  const usable = [...candidates]
    .filter(menu => menu.eligible)
    .sort((a, b) => a.code.localeCompare(b.code));
  const picked = new Map();
  for (const menu of usable) {
    const key = `${menu.category}|${menu.size}`;
    if (!picked.has(key)) picked.set(key, menu);
  }
  const result = [...picked.values()];
  for (const menu of usable) {
    if (result.length >= minimum) break;
    if (!result.includes(menu)) result.push(menu);
  }
  return result.map(menu => menu.code);
}

/** 앱이 보여 주는 값들이 서로, 그리고 수동 계산과 맞는지. 허용 오차는 줄 반올림 */
export function checkMenuValues(menu, tolerance = 2) {
  const problems = [];
  const shown = ['master', 'margin', 'report', 'excel', 'recipeSheet', 'print'];
  const present = shown.filter(key => Number.isFinite(menu.values[key]));
  for (const key of present) {
    const difference = Math.abs(menu.values[key] - menu.manual.rounded);
    if (difference > tolerance) {
      problems.push(`${key} ${menu.values[key]} ≠ 수동 ${menu.manual.rounded}`);
    }
  }
  if (present.length < 2) problems.push('비교할 화면 값이 부족합니다');
  return problems;
}

/** 저장한 기준값과 지금 값의 차이 */
export function diffBaseline(saved, current) {
  const changes = [];
  const codes = new Set([...Object.keys(saved.allMenus), ...Object.keys(current.allMenus)]);
  for (const code of [...codes].sort()) {
    const before = saved.allMenus[code];
    const after = current.allMenus[code];
    if (before !== after) changes.push({ code, what: '메뉴 원가', before, after });
  }
  for (const menu of saved.menus) {
    const now = current.menus.find(item => item.code === menu.code);
    if (!now) {
      changes.push({ code: menu.code, what: '대표 메뉴 없음' });
      continue;
    }
    const keys = new Set([...Object.keys(menu.values), ...Object.keys(now.values)]);
    for (const key of keys) {
      if (menu.values[key] !== now.values[key]) {
        changes.push({
          code: menu.code,
          what: key,
          before: menu.values[key],
          after: now.values[key],
        });
      }
    }
  }
  return changes;
}
