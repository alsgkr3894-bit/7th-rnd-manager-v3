'use client';
import { useEffect, useState, useMemo } from 'react';
import { initDB } from '@/lib/db';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllMenuMaster } from '@/lib/menu-master';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllEdges } from '@/lib/cost/edge-dough';
import { getAllPizzaRecipes } from '@/lib/cost/pizza-detail';
import { getAllPersonalRecipes } from '@/lib/cost/personal-detail';
import { getAllSideRecipes } from '@/lib/cost/side-detail';
import { getAllSetRecipes } from '@/lib/cost/set-detail';
import { getAllRecipes } from '@/lib/recipe';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { exportOriginToExcel } from '@/lib/nutrition/origin/export';
import { printOriginAll } from '@/lib/nutrition/origin/print';
import { showToast } from '@/components/Toast';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import { loadMenuNames, applyMenuName } from '@/lib/nutrition/menu-name-override';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import { MENU_ORDER_KEY, loadOrder } from '@/lib/nutrition/order';
import {
  loadIngredientNames,
  saveIngredientNames,
  applyIngredientName,
} from '@/lib/nutrition/ingredient-name-override';
import { MenuNameEditModal } from '@/components/nutrition/MenuNameEditModal';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import './origin-result.css';

const EMPTY_MENU_MAP = new Map();
const EMPTY_SET = new Set();
const asMenuMap = value => (value instanceof Map ? value : EMPTY_MENU_MAP);
const asSet = value => (value instanceof Set ? value : EMPTY_SET);
const DELIVERY_GROUPS = ['피자', '사이드'];

function normalizeOriginItems(items) {
  const seen = new Set();
  const out = [];
  for (const it of asObjectArray(items)) {
    const displayName = asDisplayText(it.displayName);
    const country = asDisplayText(it.country);
    const key = `${displayName}||${country}`;
    if (!country || seen.has(key)) continue;
    seen.add(key);
    out.push({ displayName, country });
  }
  return out;
}

function formatOriginCountries(items) {
  const safeItems = normalizeOriginItems(items);
  if (safeItems.length <= 1) return safeItems[0]?.country || '';
  return safeItems
    .map(it => {
      const displayName = asDisplayText(it.displayName);
      return displayName ? `${displayName}:${it.country}` : it.country;
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

function menuRankValue(menu, rank) {
  const code = asDisplayText(menu?.menuCode);
  const name = asDisplayText(menu?.menuName);
  if (rank.has(code)) return rank.get(code);
  if (rank.has(name)) return rank.get(name);
  return Infinity;
}

function deliveryGroupRank(group) {
  const idx = DELIVERY_GROUPS.indexOf(group);
  return idx === -1 ? DELIVERY_GROUPS.length : idx;
}

function sortMenuRefs(menuRefs, menuOrder = []) {
  const rank = makeMenuRank(menuOrder);
  return [...asObjectArray(menuRefs)].sort(
    (a, b) =>
      menuRankValue(a, rank) - menuRankValue(b, rank) ||
      deliveryGroupRank(a.group) - deliveryGroupRank(b.group) ||
      asDisplayText(a.menuName).localeCompare(asDisplayText(b.menuName), 'ko') ||
      asDisplayText(a.menuCode).localeCompare(asDisplayText(b.menuCode), 'ko')
  );
}

/**
 * 식자재 origin 배열 + 레시피 매핑 → 출력용 origins 배열로 변환.
 * 각 항목: { ingredientName, items:[{displayName,country}], menuCodes:[{menuCode,menuName}] }
 * overrides: 출력용 메뉴명 오버라이드 map
 */
function buildOriginsFromIngredients(
  ingredients,
  ingredientToMenus,
  excludedMenuCodes = new Set(),
  excludedMenuNames = new Set(),
  overrides = {},
  masterByCode = {}
) {
  const ingredientMenuMap = asMenuMap(ingredientToMenus);
  const excludedCodes = asSet(excludedMenuCodes);
  const excludedNames = asSet(excludedMenuNames);
  const result = [];
  for (const ing of asObjectArray(ingredients)) {
    const originItems = asObjectArray(ing.origin);
    if (!originItems.length || ing.discontinued || ing.excluded || ing.originHidden) continue;
    const productCode = asDisplayText(ing.productCode);
    const ingredientName = asDisplayText(ing.ingredientName);
    const codeKey = productCode ? `code:${productCode}` : null;
    const nameKey = `name:${ingredientName.trim().toLowerCase().replace(/\s+/g, '')}`;
    const byCode = codeKey ? asMenuMap(ingredientMenuMap.get(codeKey)) : new Map();
    const byName = asMenuMap(ingredientMenuMap.get(nameKey));
    const merged = new Map([...byName, ...byCode]);

    const menuCodes = [...merged.entries()]
      .filter(([menuCode, meta]) => {
        const safeMenuCode = asDisplayText(menuCode);
        return (
          !excludedCodes.has(menuCode) &&
          !excludedCodes.has(safeMenuCode) &&
          !excludedNames.has(asDisplayText(meta?.menuName).trim())
        );
      })
      .map(([menuCode, meta]) => ({
        menuCode: asDisplayText(menuCode),
        menuName: applyMenuName(asDisplayText(menuCode), asDisplayText(meta?.menuName), overrides),
        category: asDisplayText(masterByCode?.[asDisplayText(menuCode)]?.category || meta?.category),
      }));

    result.push({
      ingredientName,
      items: originItems.map(it => ({
        displayName: asDisplayText(it.displayName) || ingredientName,
        country: asDisplayText(it.country),
      })),
      menuCodes,
    });
  }
  return result;
}

/* ── 공통 ────────────────────────────────────────────────── */
const NOTICE = '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.';

/* ── 데이터 변환 ─────────────────────────────────────────── */

/**
 * 매장비치용: 표시품목 / 원산지 / 음식명
 */
function buildSheet1(origins, menuOrder = []) {
  const map = new Map();
  for (const row of asObjectArray(origins)) {
    for (const it of asObjectArray(row.items)) {
      const displayName = asDisplayText(it.displayName);
      const country = asDisplayText(it.country);
      const key = `${displayName}||${country}`;
      if (!map.has(key)) {
        map.set(key, { displayName, originCountry: country, menuRefs: new Map() });
      }
      const entry = map.get(key);
      for (const { menuCode, menuName, category } of asObjectArray(row.menuCodes)) {
        const safeMenuCode = asDisplayText(menuCode);
        const safeMenuName = asDisplayText(menuName);
        const key = safeMenuCode || safeMenuName;
        if (key) {
          const group =
            resolveNutritionGroup({ menuCode: safeMenuCode, menuName: safeMenuName, category }) ===
            '피자'
              ? '피자'
              : '사이드';
          entry.menuRefs.set(key, {
            menuCode: safeMenuCode,
            menuName: safeMenuName || safeMenuCode,
            category,
            group,
          });
        }
      }
    }
  }
  return [...map.values()]
    .map(entry => ({
      ...entry,
      menus: sortMenuRefs([...entry.menuRefs.values()], menuOrder).map(m => m.menuName),
    }))
    .sort((a, b) => asDisplayText(a.displayName).localeCompare(asDisplayText(b.displayName), 'ko'));
}

/**
 * 냉장고부착용: 재료명 / 표시품목 / 원산지
 * 재료당 1행 — 복수 원산지는 items 배열로 합산 (중복 제거).
 */
function buildSheet2(origins, ingOverrides = {}) {
  return asObjectArray(origins)
    .map(row => {
      const items = normalizeOriginItems(row.items);
      return {
        ingredientName: applyIngredientName(asDisplayText(row.ingredientName), ingOverrides),
        items,
        itemText: items.map(it => asDisplayText(it.displayName)).filter(Boolean).join(', '),
        originText: formatOriginCountries(items),
      };
    })
    .sort((a, b) =>
      asDisplayText(a.ingredientName).localeCompare(asDisplayText(b.ingredientName), 'ko')
    );
}

/**
 * 배달플랫폼용: 메뉴명 / 재료명(표시품목:원산지)
 */
function buildSheet3(origins, ingOverrides = {}, menuOrder = []) {
  const menuMap = new Map();
  for (const row of asObjectArray(origins)) {
    const inner = formatOriginCountries(row.items);
    const ingredientName = applyIngredientName(asDisplayText(row.ingredientName), ingOverrides);
    const ingText = `${ingredientName}(${inner})`;
    for (const { menuCode, menuName, category } of asObjectArray(row.menuCodes)) {
      const safeMenuCode = asDisplayText(menuCode);
      const safeMenuName = asDisplayText(menuName);
      const key = safeMenuCode || safeMenuName;
      if (!key) continue;
      const group =
        resolveNutritionGroup({ menuCode: safeMenuCode, menuName: safeMenuName, category }) ===
        '피자'
          ? '피자'
          : '사이드';
      if (!menuMap.has(key)) {
        menuMap.set(key, {
          group,
          menuCode: key,
          menuName: safeMenuName || safeMenuCode,
          parts: [],
        });
      }
      const entry = menuMap.get(key);
      if (!entry.parts.includes(ingText)) entry.parts.push(ingText);
    }
  }
  const rank = makeMenuRank(menuOrder);
  return [...menuMap.values()].sort(
    (a, b) =>
      menuRankValue(a, rank) - menuRankValue(b, rank) ||
      deliveryGroupRank(a.group) - deliveryGroupRank(b.group) ||
      asDisplayText(a.menuName).localeCompare(asDisplayText(b.menuName), 'ko') ||
      asDisplayText(a.menuCode).localeCompare(asDisplayText(b.menuCode), 'ko')
  );
}

/**
 * 원산지 정보(표기문): 재료명(표시품목 : 원산지[, 원산지 섞음], …)
 * - 한 표시품목에 원산지가 둘 이상이면 "섞음" 표기
 * - 동일한 원산지 구성을 가진 재료끼리 재료명을 쉼표로 병합
 *   예) 양념포크, 양념불고기, 세블락소시지(돼지고기 : 국내산)
 */
function buildSheet4(origins, ingOverrides = {}) {
  const entries = [];
  for (const row of asObjectArray(origins)) {
    const items = asObjectArray(row.items);
    if (!items.length) continue;
    // 표시품목 단위로 원산지 묶기 (삽입순 유지)
    const byDisplay = new Map();
    for (const it of items) {
      const dn = asDisplayText(it.displayName) || asDisplayText(row.ingredientName);
      if (!byDisplay.has(dn)) byDisplay.set(dn, []);
      const arr = byDisplay.get(dn);
      const country = asDisplayText(it.country);
      if (country && !arr.includes(country)) arr.push(country);
    }
    const breakdown = [...byDisplay.entries()]
      .map(
        ([dn, countries]) => `${dn} : ${countries.join(', ')}${countries.length > 1 ? ' 섞음' : ''}`
      )
      .join(', ');
    entries.push({
      name: applyIngredientName(asDisplayText(row.ingredientName), ingOverrides),
      breakdown,
    });
  }

  // 동일 원산지 구성끼리 재료명 병합
  const merged = new Map();
  for (const e of entries) {
    if (!e.breakdown) continue;
    if (!merged.has(e.breakdown)) merged.set(e.breakdown, []);
    const names = merged.get(e.breakdown);
    if (!names.includes(e.name)) names.push(e.name);
  }
  // 재료명 ㄱㄴㄷ 순 — 그룹 내 재료명 정렬 후, 각 줄을 첫 재료명 기준으로 정렬
  return [...merged.entries()]
    .map(([breakdown, names]) => {
      const sorted = [...names].sort((a, b) =>
        asDisplayText(a).localeCompare(asDisplayText(b), 'ko')
      );
      return { names: sorted.join(', '), breakdown, sortKey: sorted[0] || '' };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'ko'));
}

/* ── 시트 렌더러 ─────────────────────────────────────────── */

function Sheet1({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length)
    return (
      <div className="origin-result-empty">
        원산지 데이터가 없습니다. 식자재 관리에서 원산지를 입력해주세요.
      </div>
    );
  return (
    <div id="origin-print-area">
      <div className="origin-result-title large">원산지 표시판 (매장비치용)</div>
      <table className="origin-result-table origin-sign-table">
        <colgroup>
          <col className="col-item" />
          <col className="col-origin" />
          <col className="col-menu" />
        </colgroup>
        <thead>
          <tr>
            <th>표시품목</th>
            <th>원산지</th>
            <th>음식명</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((r, i) => (
            <tr key={`${asDisplayText(r.displayName)}-${asDisplayText(r.originCountry)}-${i}`}>
              <td>{asDisplayText(r.displayName)}</td>
              <td>{asDisplayText(r.originCountry)}</td>
              <td>
                {Array.isArray(r.menus) ? r.menus.join(', ') : [...asSet(r.menus)].join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="origin-result-notice large">{NOTICE}</div>
    </div>
  );
}

function Sheet2({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length) return <div className="origin-result-empty">원산지 데이터가 없습니다.</div>;
  return (
    <div id="origin-print-area">
      <div className="origin-result-title large">원산지 표시판 (냉장고부착용)</div>
      <table className="origin-result-table origin-fridge-table">
        <colgroup>
          <col className="col-food" />
          <col className="col-item" />
          <col className="col-origin" />
        </colgroup>
        <thead>
          <tr>
            <th>재료명</th>
            <th>표시품목</th>
            <th>원산지</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((r, i) => (
            <tr key={`${asDisplayText(r.ingredientName)}-${i}`}>
              <td>{asDisplayText(r.ingredientName)}</td>
              <td>{asDisplayText(r.itemText)}</td>
              <td>{asDisplayText(r.originText)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="origin-result-notice large">{NOTICE}</div>
    </div>
  );
}

function Sheet3({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length) return <div className="origin-result-empty">원산지 데이터가 없습니다.</div>;
  return (
    <div id="origin-print-area">
      <div className="origin-result-title">배달플랫폼 원산지 표기</div>
      <table className="origin-result-table origin-delivery-table">
        <colgroup>
          <col style={{ width: '90px' }} />
          <col className="col-menu" />
          <col className="col-ing" />
        </colgroup>
        <thead>
          <tr>
            <th>구분</th>
            <th>메뉴명</th>
            <th>재료명(원산지)</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((r, i) => (
            <tr key={`${asDisplayText(r.menuCode) || asDisplayText(r.menuName)}-${i}`}>
              <td style={{ fontWeight: 700, textAlign: 'center' }}>{asDisplayText(r.group)}</td>
              <td style={{ fontWeight: 600 }}>{asDisplayText(r.menuName)}</td>
              <td>
                {Array.isArray(r.parts) ? r.parts.map(part => asDisplayText(part)).join(', ') : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="origin-result-notice">{NOTICE}</div>
    </div>
  );
}

function Sheet4({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length) return <div className="origin-result-empty">원산지 데이터가 없습니다.</div>;
  return (
    <div id="origin-print-area">
      <div className="origin-result-title large">원산지 정보</div>
      <div className="origin-statement-box">
        {safeRows.map((r, i) => (
          <p className="origin-statement-line" key={`${asDisplayText(r.names)}-${i}`}>
            <span className="origin-statement-names">{asDisplayText(r.names)}</span>
            <span className="origin-statement-paren">({asDisplayText(r.breakdown)})</span>
          </p>
        ))}
      </div>
      <div className="origin-result-notice large">{NOTICE}</div>
    </div>
  );
}

/* ── 메인 컴포넌트 ───────────────────────────────────────── */
const SUB_TABS = [
  { key: 'store', label: '매장비치용' },
  { key: 'fridge', label: '냉장고부착용' },
  { key: 'delivery', label: '배달플랫폼용' },
  { key: 'statement', label: '원산지 정보' },
];

export default function OriginResult() {
  const [origins, setOrigins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('store');
  const [exporting, setExporting] = useState(false);
  const [ingEditOpen, setIngEditOpen] = useState(false);
  const [ingOverrides, setIngOverrides] = useState(() => loadIngredientNames());
  const [menuOrder, setMenuOrder] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      await initDB();
      const overrides = loadMenuNames();
      const [ings, masters, groups, edges, pizzaRecs, personalRecs, sideRecs, setRecs, oldRecs] =
        await Promise.all([
          getAllIngredients(),
          getAllMenuMaster(),
          getAllRecipeGroups(),
          getAllEdges(),
          getAllPizzaRecipes(),
          getAllPersonalRecipes(),
          getAllSideRecipes(),
          getAllSetRecipes(),
          getAllRecipes(),
        ]);
      const safeIngredients = asObjectArray(ings);
      const safeMenuMasters = asObjectArray(masters);
      const safeGroups = asObjectArray(groups);
      const safeEdges = asObjectArray(edges);
      const safeOldRecipes = asObjectArray(oldRecs);
      const masterByCode = Object.fromEntries(
        safeMenuMasters.map(m => [asDisplayText(m.menuCode), m]).filter(([menuCode]) => menuCode)
      );
      const detailRecipes = tagDetailRecipes(
        asObjectArray(pizzaRecs),
        asObjectArray(personalRecs),
        asObjectArray(sideRecs),
        asObjectArray(setRecs)
      );
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: safeMenuMasters,
        detailRecipes,
        oldRecipes: safeOldRecipes,
        groups: safeGroups,
        edges: safeEdges,
      });
      const { excludedMenuCodes, excludedMenuNames } = extractExcludedMenuSets(safeMenuMasters);
      if (!alive) return;
      setMenuOrder(loadOrder(MENU_ORDER_KEY));
      setOrigins(
        buildOriginsFromIngredients(
          safeIngredients,
          ingredientToMenus,
          excludedMenuCodes,
          excludedMenuNames,
          overrides,
          masterByCode
        )
      );
    })()
      .catch(err => {
        if (alive) console.error(err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const sheet1 = useMemo(() => buildSheet1(origins, menuOrder), [origins, menuOrder]);
  const sheet2 = useMemo(() => buildSheet2(origins, ingOverrides), [origins, ingOverrides]);
  const sheet3 = useMemo(
    () => buildSheet3(origins, ingOverrides, menuOrder),
    [origins, ingOverrides, menuOrder]
  );
  const sheet4 = useMemo(() => buildSheet4(origins, ingOverrides), [origins, ingOverrides]);

  async function handleExcel() {
    if (!origins.length) {
      showToast('원산지 데이터가 없습니다', 'warn');
      return;
    }
    setExporting(true);
    try {
      await exportOriginToExcel({ sheet1, sheet2, sheet3, sheet4 });
      showToast('엑셀 다운로드 완료', 'ok');
    } catch (e) {
      showToast('엑셀 출력 실패: ' + asDisplayText(e?.message, '알 수 없는 오류'), 'err');
    } finally {
      setExporting(false);
    }
  }

  function handlePdf() {
    if (!origins.length) {
      showToast('원산지 데이터가 없습니다', 'warn');
      return;
    }
    printOriginAll({ sheet1, sheet2, sheet3, sheet4 });
  }

  if (loading)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 44,
              borderRadius: 8,
              background: 'var(--surface-2)',
              opacity: 1 - i * 0.12,
            }}
          />
        ))}
      </div>
    );

  return (
    <div className="origin-result-wrap">
      {/* 상위 탭 — 원산지표시판 (향후 영양성분표 등 추가 대비) */}
      <div className="origin-result-tabs origin-result-tabs-top">
        <button className="origin-result-tab active">원산지표시판</button>
      </div>

      {/* 하위 서브탭 */}
      <div className="origin-result-tabs origin-result-subtabs">
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            className={`origin-result-tab origin-result-subtab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="origin-result-actions">
        <button className="origin-result-btn" onClick={() => setIngEditOpen(true)}>
          ✏️ 식자재명 편집
        </button>
        <button className="origin-result-btn" onClick={handlePdf}>
          🖨 PDF 통합 출력
        </button>
        <button className="origin-result-btn primary" onClick={handleExcel} disabled={exporting}>
          {exporting ? '출력 중…' : '⬇ 엑셀 통합 다운로드'}
        </button>
      </div>

      {/* 표 */}
      {tab === 'store' && <Sheet1 rows={sheet1} />}
      {tab === 'fridge' && <Sheet2 rows={sheet2} />}
      {tab === 'delivery' && <Sheet3 rows={sheet3} />}
      {tab === 'statement' && <Sheet4 rows={sheet4} />}

      {ingEditOpen && (
        <MenuNameEditModal
          menus={asObjectArray(origins)
            .map(o => {
              const ingredientName = asDisplayText(o.ingredientName);
              return { menuCode: ingredientName, menuName: ingredientName };
            })
            .filter(menu => menu.menuCode)}
          overrides={ingOverrides}
          onApply={next => {
            saveIngredientNames(next);
            setIngOverrides(next);
          }}
          onClose={() => setIngEditOpen(false)}
        />
      )}
    </div>
  );
}
