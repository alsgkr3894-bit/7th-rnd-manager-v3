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
import { MENU_ORDER_KEY, loadOrder, applyOrder } from '@/lib/nutrition/order';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import { loadMenuNames, applyMenuName } from '@/lib/nutrition/menu-name-override';
import { loadIngredientNames, saveIngredientNames, applyIngredientName } from '@/lib/nutrition/ingredient-name-override';
import { MenuNameEditModal } from '@/components/nutrition/MenuNameEditModal';
import './origin-result.css';

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
  overrides = {}
) {
  const result = [];
  for (const ing of ingredients) {
    if (!ing.origin?.length || ing.discontinued || ing.excluded || ing.originHidden) continue;
    const codeKey = ing.productCode ? `code:${ing.productCode}` : null;
    const nameKey = `name:${(ing.ingredientName || '').trim().toLowerCase().replace(/\s+/g, '')}`;
    const byCode = codeKey ? ingredientToMenus.get(codeKey) || new Map() : new Map();
    const byName = ingredientToMenus.get(nameKey) || new Map();
    const merged = new Map([...byName, ...byCode]);

    const menuCodes = [...merged.entries()]
      .filter(
        ([menuCode, meta]) =>
          !excludedMenuCodes.has(menuCode) && !excludedMenuNames.has((meta.menuName || '').trim())
      )
      .map(([menuCode, meta]) => ({
        menuCode,
        menuName: applyMenuName(menuCode, meta.menuName, overrides),
      }));

    result.push({
      ingredientName: ing.ingredientName,
      items: ing.origin.map(it => ({
        displayName: it.displayName || ing.ingredientName,
        country: it.country,
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
function buildSheet1(origins) {
  const map = new Map();
  for (const row of origins) {
    for (const it of row.items) {
      const key = `${it.displayName}||${it.country}`;
      if (!map.has(key)) {
        map.set(key, { displayName: it.displayName, originCountry: it.country, menus: new Set() });
      }
      const entry = map.get(key);
      for (const { menuName } of row.menuCodes || []) {
        if (menuName) entry.menus.add(menuName);
      }
    }
  }
  return [...map.values()].sort((a, b) =>
    (a.displayName || '').localeCompare(b.displayName || '', 'ko')
  );
}

/**
 * 냉장고부착용: 재료명 / 표시품목 / 원산지
 * 재료당 1행 — 복수 원산지는 items 배열로 합산 (중복 제거).
 */
function buildSheet2(origins, ingOverrides = {}) {
  return origins
    .map(row => {
      const seen = new Set();
      const items = [];
      for (const it of row.items) {
        const k = `${it.displayName}||${it.country}`;
        if (!seen.has(k)) { seen.add(k); items.push(it); }
      }
      return {
        ingredientName: applyIngredientName(row.ingredientName, ingOverrides),
        items,
      };
    })
    .sort((a, b) => (a.ingredientName || '').localeCompare(b.ingredientName || '', 'ko'));
}

/**
 * 배달플랫폼용: 메뉴명 / 재료명(표시품목:원산지)
 */
function buildSheet3(origins, ingOverrides = {}) {
  const menuMap = new Map();
  for (const row of origins) {
    const inner = row.items.map(it => `${it.displayName}:${it.country}`).join('/');
    const ingText = `${applyIngredientName(row.ingredientName, ingOverrides)}(${inner})`;
    for (const { menuCode, menuName } of row.menuCodes || []) {
      const key = menuCode || menuName;
      if (!key) continue;
      if (!menuMap.has(key))
        menuMap.set(key, { menuCode: key, menuName: menuName || menuCode, parts: [] });
      const entry = menuMap.get(key);
      if (!entry.parts.includes(ingText)) entry.parts.push(ingText);
    }
  }
  return applyOrder(
    [...menuMap.values()],
    loadOrder(MENU_ORDER_KEY),
    m => m.menuCode,
    m => m.menuName
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
  for (const row of origins) {
    if (!row.items?.length) continue;
    // 표시품목 단위로 원산지 묶기 (삽입순 유지)
    const byDisplay = new Map();
    for (const it of row.items) {
      const dn = it.displayName || row.ingredientName;
      if (!byDisplay.has(dn)) byDisplay.set(dn, []);
      const arr = byDisplay.get(dn);
      if (it.country && !arr.includes(it.country)) arr.push(it.country);
    }
    const breakdown = [...byDisplay.entries()]
      .map(([dn, countries]) => `${dn} : ${countries.join(', ')}${countries.length > 1 ? ' 섞음' : ''}`)
      .join(', ');
    entries.push({ name: applyIngredientName(row.ingredientName, ingOverrides), breakdown });
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
      const sorted = [...names].sort((a, b) => (a || '').localeCompare(b || '', 'ko'));
      return { names: sorted.join(', '), breakdown, sortKey: sorted[0] || '' };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'ko'));
}

/* ── 시트 렌더러 ─────────────────────────────────────────── */

function Sheet1({ rows }) {
  if (!rows.length)
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
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.displayName}</td>
              <td>{r.originCountry}</td>
              <td>{[...r.menus].join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="origin-result-notice large">{NOTICE}</div>
    </div>
  );
}

function Sheet2({ rows }) {
  if (!rows.length) return <div className="origin-result-empty">원산지 데이터가 없습니다.</div>;
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
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.ingredientName}</td>
              <td className="origin-multiline">{r.items.map(it => it.displayName).join('\n')}</td>
              <td className="origin-multiline">{r.items.map(it => it.country).join('\n')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="origin-result-notice large">{NOTICE}</div>
    </div>
  );
}

function Sheet3({ rows }) {
  if (!rows.length) return <div className="origin-result-empty">원산지 데이터가 없습니다.</div>;
  return (
    <div id="origin-print-area">
      <div className="origin-result-title">배달플랫폼 원산지 표기</div>
      <table className="origin-result-table origin-delivery-table">
        <colgroup>
          <col className="col-menu" />
          <col className="col-ing" />
        </colgroup>
        <thead>
          <tr>
            <th>메뉴명</th>
            <th>재료명(원산지)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{r.menuName}</td>
              <td>{r.parts.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="origin-result-notice">{NOTICE}</div>
    </div>
  );
}

function Sheet4({ rows }) {
  if (!rows.length) return <div className="origin-result-empty">원산지 데이터가 없습니다.</div>;
  return (
    <div id="origin-print-area">
      <div className="origin-result-title large">원산지 정보</div>
      <div className="origin-statement-box">
        {rows.map((r, i) => (
          <p className="origin-statement-line" key={i}>
            <span className="origin-statement-names">{r.names}</span>
            <span className="origin-statement-paren">({r.breakdown})</span>
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

  useEffect(() => {
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
      const detailRecipes = tagDetailRecipes(pizzaRecs, personalRecs, sideRecs, setRecs);
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: masters,
        detailRecipes,
        oldRecipes: oldRecs,
        groups,
        edges,
      });
      const { excludedMenuCodes, excludedMenuNames } = extractExcludedMenuSets(masters);
      setOrigins(
        buildOriginsFromIngredients(
          ings,
          ingredientToMenus,
          excludedMenuCodes,
          excludedMenuNames,
          overrides
        )
      );
    })()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sheet1 = useMemo(() => buildSheet1(origins), [origins]);
  const sheet2 = useMemo(() => buildSheet2(origins, ingOverrides), [origins, ingOverrides]);
  const sheet3 = useMemo(() => buildSheet3(origins, ingOverrides), [origins, ingOverrides]);
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
      showToast('엑셀 출력 실패: ' + e.message, 'err');
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

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ height: 44, borderRadius: 8, background: 'var(--surface-2)', opacity: 1 - i * 0.12 }} />
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
          menus={origins.map(o => ({ menuCode: o.ingredientName, menuName: o.ingredientName }))}
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
