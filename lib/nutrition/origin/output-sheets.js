import { getMenuCodeRank } from '@/lib/menu-categories';
import { getMenuCodeBase } from '@/lib/menu-master/code-policy';
import { applyIngredientName as applyIngredientNameOverride } from '@/lib/nutrition/ingredient-name-override';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import {
  formatStoreDisplayItem,
  formatStoreOriginCountry,
  stripPizzaWord,
  stripToppingWord,
} from '@/lib/nutrition/origin/store-display-format';

// 원산지 출력 재료명: 사용자 재료명 수정(오버라이드) 적용 후 "토핑" 단어를 뺀다
// (2026-09-22: "불고기토핑·포크토핑"이 표시판에 그대로 나오던 것 정리).
function applyIngredientName(name, overrides) {
  return stripToppingWord(applyIngredientNameOverride(name, overrides));
}
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const DELIVERY_GROUPS = ['피자', '사이드'];

export function normalizeOriginItems(items) {
  const seen = new Set();
  const out = [];
  for (const item of asObjectArray(items)) {
    const displayName = asDisplayText(item.displayName);
    const country = asDisplayText(item.country);
    const key = `${displayName}||${country}`;
    if (!country || seen.has(key)) continue;
    seen.add(key);
    out.push({ displayName, country });
  }
  return out;
}

export function formatOriginCountries(items) {
  const safeItems = normalizeOriginItems(items);
  if (safeItems.length <= 1) return safeItems[0]?.country || '';
  return safeItems
    .map(item => {
      const displayName = asDisplayText(item.displayName);
      return displayName ? `${displayName}:${item.country}` : item.country;
    })
    .filter(Boolean)
    .join(', ');
}

function makeMenuRank(menuOrder = []) {
  return new Map(
    (Array.isArray(menuOrder) ? menuOrder : [])
      .map((key, index) => [asDisplayText(key), index])
      .filter(([key]) => key)
  );
}

// 저장된 순서 배열은 "메뉴 출력 순서" 편집 당시 존재하던 메뉴 전체를 한 번에 저장한 스냅샷이다
// (ReorderModal.apply → 전체 목록의 key 배열). 그 뒤 새로 추가된 메뉴는 이 배열에 없으므로,
// 예전엔 무조건 Infinity를 줘서 시트 전체의 맨 끝(마지막 카테고리 뒤)으로 밀려났다 — offset을
// 더해도 저장된 항목 수보다는 항상 크므로 결과가 같았다. 대신 저장된 순서 배열 안에서 "이
// 카테고리 순위(categoryRank) 이하인 항목 중 가장 뒤에 있는 위치"를 찾아 그 바로 뒤(+0.5)에
// 끼워 넣는다 — 저장 당시 카테고리별로 모여 있던 순서를 그대로 이어받아, 신규 피자 메뉴는 기존
// 피자 블록 뒤·사이드 블록 앞에 들어간다. 2026-09-22: 신규 메뉴가 표시판 맨 밑에 붙던 버그 수정.
function buildUnorderedRankLookup(menuOrder) {
  const keys = Array.isArray(menuOrder) ? menuOrder : [];
  const cache = new Map();
  return categoryRank => {
    if (cache.has(categoryRank)) return cache.get(categoryRank);
    let insertAfter = -1;
    keys.forEach((key, index) => {
      if (getMenuCodeRank(asDisplayText(key)) <= categoryRank) insertAfter = index;
    });
    const value = insertAfter + 0.5;
    cache.set(categoryRank, value);
    return value;
  };
}

function menuRankValue(menu, rank, unorderedRankLookup) {
  const code = asDisplayText(menu?.menuCode);
  const sortCode = asDisplayText(menu?.sortMenuCode);
  const name = asDisplayText(menu?.menuName);
  if (rank.has(code)) return rank.get(code);
  if (rank.has(sortCode)) return rank.get(sortCode);
  if (rank.has(name)) return rank.get(name);
  return unorderedRankLookup(getMenuCodeRank(sortCode || code));
}

function deliveryGroupRank(group) {
  const index = DELIVERY_GROUPS.indexOf(group);
  return index === -1 ? DELIVERY_GROUPS.length : index;
}

function sortMenuRefs(menuRefs, menuOrder = []) {
  const rank = makeMenuRank(menuOrder);
  const unorderedRankLookup = buildUnorderedRankLookup(menuOrder);
  return [...asObjectArray(menuRefs)].sort(
    (a, b) =>
      menuRankValue(a, rank, unorderedRankLookup) - menuRankValue(b, rank, unorderedRankLookup) ||
      deliveryGroupRank(a.group) - deliveryGroupRank(b.group) ||
      getMenuCodeRank(asDisplayText(a.sortMenuCode || a.menuCode)) -
        getMenuCodeRank(asDisplayText(b.sortMenuCode || b.menuCode)) ||
      asDisplayText(a.menuName).localeCompare(asDisplayText(b.menuName), 'ko') ||
      asDisplayText(a.menuCode).localeCompare(asDisplayText(b.menuCode), 'ko')
  );
}

function resolveDeliveryGroup({ menuCode, menuName, category }) {
  return resolveNutritionGroup({ menuCode, menuName, category }) === '피자' ? '피자' : '사이드';
}

// 하프앤하프는 영양 그룹상 별도 그룹이지만 매장비치용 메뉴명 표기(피자 단어 제거·피자공통
// 뒤에 따로 나열하지 않음)에서는 피자와 같이 다룬다.
function isPizzaLikeMenu({ menuCode, menuName, category }) {
  const group = resolveNutritionGroup({ menuCode, menuName, category });
  return group === '피자' || group === '하프앤하프';
}

function getLrSizeFromCode(menuCode) {
  const matched = asDisplayText(menuCode).match(/-([LR])$/i);
  return matched ? matched[1].toUpperCase() : '';
}

function stripMenuNameSizeSuffix(menuName, size) {
  const name = asDisplayText(menuName);
  const sizeLabel = asDisplayText(size).toUpperCase();
  if (!name || !sizeLabel) return name;
  const upperName = name.toUpperCase();
  const suffixes = [
    ` (${sizeLabel})`,
    `（${sizeLabel}）`,
    ` [${sizeLabel}]`,
    `[${sizeLabel}]`,
    `-${sizeLabel}`,
    `_${sizeLabel}`,
    `/${sizeLabel}`,
    ` ${sizeLabel}`,
    sizeLabel,
  ];
  for (const suffix of suffixes) {
    if (!upperName.endsWith(suffix)) continue;
    const next = name.slice(0, name.length - suffix.length).trim();
    if (next) return next;
  }
  return name;
}

function buildOriginOutputMenuRef({ menuCode, menuName, category }) {
  const safeMenuCode = asDisplayText(menuCode);
  const safeMenuName = asDisplayText(menuName);
  const size = getLrSizeFromCode(safeMenuCode);
  const baseCode = size ? getMenuCodeBase(safeMenuCode, size) : safeMenuCode;
  const displayName = size ? stripMenuNameSizeSuffix(safeMenuName, size) : safeMenuName;
  const menuKey = baseCode || displayName;
  const finalName = displayName || baseCode || safeMenuCode;
  return {
    menuKey,
    menuCode: baseCode || safeMenuCode,
    sortMenuCode: safeMenuCode,
    menuName: finalName,
    category,
    group: resolveDeliveryGroup({ menuCode: safeMenuCode, menuName: finalName, category }),
    pizzaLike: isPizzaLikeMenu({ menuCode: safeMenuCode, menuName: finalName, category }),
  };
}

export const PIZZA_COMMON_LABEL = '피자공통';

/**
 * 매장비치용 표에서 메뉴명이 같은 "피자공통" 행이 연속되면 한 칸으로 합친다(양식의 치즈·도우
 * 행처럼). 반환: [{ start, length }] — 화면 rowSpan·엑셀 merge에 같이 쓴다.
 */
export function buildPizzaCommonSpans(rows) {
  const safeRows = asObjectArray(rows);
  const spans = [];
  let i = 0;
  while (i < safeRows.length) {
    const text = safeRows[i].pizzaCommon ? menuListText(safeRows[i].menus) : null;
    let j = i + 1;
    while (
      text !== null &&
      j < safeRows.length &&
      safeRows[j].pizzaCommon &&
      menuListText(safeRows[j].menus) === text
    ) {
      j += 1;
    }
    if (j - i > 1) spans.push({ start: i, length: j - i });
    i = j;
  }
  return spans;
}

export function menuListText(menus) {
  if (Array.isArray(menus)) return menus.map(asDisplayText).filter(Boolean).join(', ');
  return menus instanceof Set ? [...menus].join(', ') : '';
}

function storeMenuLabel(menu) {
  return menu.pizzaLike ? stripPizzaWord(menu.menuName) : asDisplayText(menu.menuName);
}

/**
 * 매장비치용 표시판 — 재료당 1행: 표시품목(재료명) / (표시품목:원산지/…) / 메뉴명.
 * 2026-09-22 주임님이 준 양식(원산지 매장비치용.xlsx)에 맞춤:
 *   - 원산지는 전체를 괄호로 감싸고, 피자 메뉴는 "피자" 단어를 뺀다
 *   - 모든 피자에 들어가는 재료(치즈·도우)는 피자 목록 대신 "피자공통"으로 적는다
 *   - 표시품목이 하나이고 메뉴 목록이 같은 재료들(까망베르·모짜렐라·고다)은 한 행으로 합쳐
 *     "치즈(까망베르, 모짜렐라, 고다) / (까망베르:덴마크산/모짜렐라:…)"로 적는다
 */
// 원산지 행(재료)마다 정규화된 표시품목 목록과 메뉴 참조를 모으고, 전체 피자 메뉴 키 집합도
// 함께 돌려준다 — "모든 피자에 들어가는 재료(피자공통)" 판정에 쓴다.
function collectOriginRows(origins, ingredientOverrides = {}) {
  const rows = [];
  const allPizzaKeys = new Set();
  for (const row of asObjectArray(origins)) {
    const items = normalizeOriginItems(row.items);
    if (!items.length) continue;
    const menuRefs = new Map();
    for (const { menuCode, menuName, category } of asObjectArray(row.menuCodes)) {
      const menuRef = buildOriginOutputMenuRef({ menuCode, menuName, category });
      if (!menuRef.menuKey || menuRefs.has(menuRef.menuKey)) continue;
      menuRefs.set(menuRef.menuKey, menuRef);
      if (menuRef.group === '피자') allPizzaKeys.add(menuRef.menuKey);
    }
    rows.push({
      ingredientName: applyIngredientName(asDisplayText(row.ingredientName), ingredientOverrides),
      items,
      menuRefs,
    });
  }
  return { rows, allPizzaKeys };
}

function isPizzaCommonRow(row, allPizzaKeys) {
  return allPizzaKeys.size >= 2 && [...allPizzaKeys].every(key => row.menuRefs.has(key));
}

export function buildOriginStoreSheet(origins, menuOrder = [], ingredientOverrides = {}) {
  const { rows, allPizzaKeys } = collectOriginRows(origins, ingredientOverrides);

  const merged = new Map();
  rows.forEach((row, index) => {
    const displayNames = [...new Set(row.items.map(item => item.displayName))];
    const menuSignature = [...row.menuRefs.keys()].sort().join('|');
    // 표시품목이 하나뿐인 재료끼리는 같은 메뉴 목록일 때 한 행으로 합친다(어느 메뉴에도
    // 안 쓰이는 재료는 "같은 목록"이 아니라 그냥 비어 있는 것이라 합치지 않는다).
    const mergeKey =
      displayNames.length === 1 && row.items.length === 1 && menuSignature
        ? `${displayNames[0]}||${menuSignature}`
        : `#${index}`;
    if (!merged.has(mergeKey)) {
      merged.set(mergeKey, { displayNames, ingredientNames: [], rows: [] });
    }
    const entry = merged.get(mergeKey);
    if (row.ingredientName && !entry.ingredientNames.includes(row.ingredientName)) {
      entry.ingredientNames.push(row.ingredientName);
    }
    entry.rows.push(row);
  });

  return [...merged.values()]
    .map(entry => {
      const mergedGroup = entry.rows.length > 1;
      const originParts = mergedGroup
        ? entry.rows.map(row => ({ label: row.ingredientName, country: row.items[0].country }))
        : entry.rows[0].items.map(item => ({ label: item.displayName, country: item.country }));
      const menuRefs = sortMenuRefs([...entry.rows[0].menuRefs.values()], menuOrder);
      const pizzaCommon = isPizzaCommonRow(entry.rows[0], allPizzaKeys);
      const menus = pizzaCommon
        ? [PIZZA_COMMON_LABEL, ...menuRefs.filter(m => !m.pizzaLike).map(storeMenuLabel)]
        : menuRefs.map(storeMenuLabel);
      return {
        rawDisplayName: entry.displayNames.join(', '),
        ingredientNames: entry.ingredientNames,
        displayName: formatStoreDisplayItem(entry.displayNames, entry.ingredientNames),
        originCountry: formatStoreOriginCountry(originParts),
        menus,
        pizzaCommon,
      };
    })
    .sort(
      (a, b) =>
        Number(b.pizzaCommon) - Number(a.pizzaCommon) ||
        a.rawDisplayName.localeCompare(b.rawDisplayName, 'ko') ||
        asDisplayText(a.ingredientNames[0]).localeCompare(asDisplayText(b.ingredientNames[0]), 'ko')
    );
}

/**
 * 냉장고부착용 — 음식명(재료명) / 표시품목 / (표시품목:원산지/…). 메뉴 목록은 없다.
 * 2026-09-22 주임님이 준 양식(냉장고원산지.xlsx)에 맞춤: 표시품목과 원산지가 완전히 같은
 * 재료들(미트소스·페페로니, 양념포크·양념불고기·세블락소시지)은 한 행으로 합친다.
 */
export function buildOriginFridgeSheet(origins, ingredientOverrides = {}) {
  const merged = new Map();
  for (const row of asObjectArray(origins)) {
    const items = normalizeOriginItems(row.items);
    if (!items.length) continue;
    const ingredientName = applyIngredientName(
      asDisplayText(row.ingredientName),
      ingredientOverrides
    );
    const key = items.map(item => `${item.displayName}=${item.country}`).join('|');
    if (!merged.has(key)) merged.set(key, { items, ingredientNames: [] });
    const entry = merged.get(key);
    if (ingredientName && !entry.ingredientNames.includes(ingredientName)) {
      entry.ingredientNames.push(ingredientName);
    }
  }
  return [...merged.values()]
    .map(entry => {
      const itemText = [...new Set(entry.items.map(item => item.displayName))].join(', ');
      return {
        ingredientName: entry.ingredientNames.join(', '),
        ingredientNames: entry.ingredientNames,
        items: entry.items,
        itemText,
        originText: formatStoreOriginCountry(
          entry.items.map(item => ({ label: item.displayName, country: item.country }))
        ),
      };
    })
    .sort(
      (a, b) =>
        a.itemText.localeCompare(b.itemText, 'ko') ||
        a.ingredientName.localeCompare(b.ingredientName, 'ko')
    );
}

export function buildOriginDeliverySheet(origins, ingredientOverrides = {}, menuOrder = []) {
  const menuMap = new Map();
  for (const row of asObjectArray(origins)) {
    const inner = formatOriginCountries(row.items);
    const ingredientName = applyIngredientName(
      asDisplayText(row.ingredientName),
      ingredientOverrides
    );
    const ingredientText = `${ingredientName}(${inner})`;
    for (const { menuCode, menuName, category } of asObjectArray(row.menuCodes)) {
      const menuRef = buildOriginOutputMenuRef({ menuCode, menuName, category });
      if (!menuRef.menuKey) continue;
      if (!menuMap.has(menuRef.menuKey)) {
        menuMap.set(menuRef.menuKey, {
          group: menuRef.group,
          menuCode: menuRef.menuCode,
          sortMenuCode: menuRef.sortMenuCode,
          menuName: menuRef.menuName,
          parts: [],
        });
      }
      const entry = menuMap.get(menuRef.menuKey);
      if (!entry.parts.includes(ingredientText)) entry.parts.push(ingredientText);
    }
  }
  const rank = makeMenuRank(menuOrder);
  const unorderedRankLookup = buildUnorderedRankLookup(menuOrder);
  return [...menuMap.values()].sort(
    (a, b) =>
      menuRankValue(a, rank, unorderedRankLookup) - menuRankValue(b, rank, unorderedRankLookup) ||
      deliveryGroupRank(a.group) - deliveryGroupRank(b.group) ||
      getMenuCodeRank(asDisplayText(a.sortMenuCode || a.menuCode)) -
        getMenuCodeRank(asDisplayText(b.sortMenuCode || b.menuCode)) ||
      asDisplayText(a.menuName).localeCompare(asDisplayText(b.menuName), 'ko') ||
      asDisplayText(a.menuCode).localeCompare(asDisplayText(b.menuCode), 'ko')
  );
}

/**
 * 원산지정보 표기문 — 재료명(표시품목 : 원산지[, 원산지 섞음], …). 같은 표기의 재료는
 * "양념포크, 양념불고기, 세블락소시지(돼지고기 : 국내산)"처럼 이름을 합친다.
 * 2026-09-22 주임님 양식: 모든 피자에 들어가는 재료(도우·치즈)는 "※ 피자공통" 아래 한 줄씩,
 * 나머지는 한 문단으로 이어 쓴다 — pizzaCommon 플래그로 구분하고 공통이 먼저 온다.
 */
export function buildOriginStatementSheet(origins, ingredientOverrides = {}) {
  const { rows, allPizzaKeys } = collectOriginRows(origins, ingredientOverrides);
  const merged = new Map();
  for (const row of rows) {
    const byDisplay = new Map();
    for (const item of row.items) {
      const displayName = item.displayName || row.ingredientName;
      if (!byDisplay.has(displayName)) byDisplay.set(displayName, []);
      const countries = byDisplay.get(displayName);
      // 식자재 관리의 원산지 값은 "호주산,뉴질랜드산"처럼 쉼표로 여러 나라를 담는다
      for (const country of splitCountries(item.country)) {
        if (!countries.includes(country)) countries.push(country);
      }
    }
    const breakdown = [...byDisplay.entries()]
      .map(
        ([displayName, countries]) =>
          `${displayName} : ${countries.join(', ')}${countries.length > 1 ? ' 섞음' : ''}`
      )
      .join(', ');
    if (!breakdown) continue;
    const pizzaCommon = isPizzaCommonRow(row, allPizzaKeys);
    const key = `${pizzaCommon ? 'common' : 'menu'}||${breakdown}`;
    if (!merged.has(key)) merged.set(key, { breakdown, pizzaCommon, names: [] });
    const entry = merged.get(key);
    if (row.ingredientName && !entry.names.includes(row.ingredientName)) {
      entry.names.push(row.ingredientName);
    }
  }

  return [...merged.values()]
    .map(entry => {
      const sorted = [...entry.names].sort((a, b) => a.localeCompare(b, 'ko'));
      return {
        names: sorted.join(', '),
        breakdown: entry.breakdown,
        sortKey: sorted[0] || '',
        pizzaCommon: entry.pizzaCommon,
      };
    })
    .sort(
      (a, b) =>
        Number(b.pizzaCommon) - Number(a.pizzaCommon) || a.sortKey.localeCompare(b.sortKey, 'ko')
    );
}

function splitCountries(country) {
  return asDisplayText(country)
    .replace(/\s*섞음\s*$/, '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

/** 표기문 한 항목: "도우(밀 : 미국산, 캐나다산 섞음, 흑미 : 국내산)" */
export function formatOriginStatementEntry(row) {
  return `${asDisplayText(row?.names)}(${asDisplayText(row?.breakdown)})`;
}

/**
 * 표기문을 양식대로 줄로 푼다: "※ 피자공통" / 공통 재료 한 줄씩 / 빈 줄 / 나머지 한 문단.
 * 공통 재료가 없으면 문단만 돌려준다. 화면·인쇄·엑셀이 같은 결과를 쓴다.
 */
export function buildOriginStatementLines(rows) {
  const safeRows = asObjectArray(rows);
  const common = safeRows.filter(row => row.pizzaCommon).map(formatOriginStatementEntry);
  const rest = safeRows.filter(row => !row.pizzaCommon).map(formatOriginStatementEntry);
  const lines = [];
  if (common.length) lines.push(`※ ${PIZZA_COMMON_LABEL}`, ...common, '');
  if (rest.length) lines.push(rest.join(' '));
  return lines;
}
