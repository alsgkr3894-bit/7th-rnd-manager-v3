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
import { showToast } from '@/components/Toast';
import './origin-result.css';

/**
 * 식자재 origin 배열 + 레시피 매핑 → 출력용 origins 배열로 변환.
 * 각 항목: { ingredientName, items:[{displayName,country}], menuCodes:[{menuCode,menuName}] }
 */
function buildOriginsFromIngredients(ingredients, ingredientToMenus, excludedMenuCodes = new Set(), excludedMenuNames = new Set()) {
  const result = [];
  for (const ing of ingredients) {
    if (!ing.origin?.length || ing.discontinued || ing.excluded || ing.originHidden) continue;
    const codeKey = ing.productCode ? `code:${ing.productCode}` : null;
    const nameKey = `name:${(ing.ingredientName || '').trim().toLowerCase().replace(/\s+/g, '')}`;
    const byCode  = codeKey ? (ingredientToMenus.get(codeKey) || new Map()) : new Map();
    const byName  = ingredientToMenus.get(nameKey) || new Map();
    const merged  = new Map([...byName, ...byCode]);

    const menuCodes = [...merged.entries()]
      .filter(([menuCode, meta]) => !excludedMenuCodes.has(menuCode) && !excludedMenuNames.has((meta.menuName || '').trim()))
      .map(([menuCode, meta]) => ({ menuCode, menuName: meta.menuName }));

    result.push({
      ingredientName: ing.ingredientName,
      items: ing.origin.map(it => ({
        displayName: it.displayName || ing.ingredientName,
        country:     it.country,
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
 * (표시품목+원산지) 쌍 단위로 집계 — 복수 원산지 항목도 각각 1행.
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
      for (const { menuName } of (row.menuCodes || [])) {
        if (menuName) entry.menus.add(menuName);
      }
    }
  }
  return [...map.values()];
}

/**
 * 냉장고부착용: 재료명 / 표시품목 / 원산지
 * 복수 원산지는 항목별로 행 분리.
 */
function buildSheet2(origins) {
  const rows = [];
  for (const row of origins) {
    for (const it of row.items) {
      rows.push({ ingredientName: row.ingredientName, displayName: it.displayName, originCountry: it.country });
    }
  }
  return rows;
}

/**
 * 배달플랫폼용: 메뉴명 / 재료명(표시품목:원산지)
 * 복수 원산지 → "재료명(표시품목1:원산지1/표시품목2:원산지2)" 형식.
 */
function buildSheet3(origins) {
  const menuMap = new Map();
  for (const row of origins) {
    const inner = row.items.map(it => `${it.displayName}:${it.country}`).join('/');
    const ingText = `${row.ingredientName}(${inner})`;
    for (const { menuCode, menuName } of (row.menuCodes || [])) {
      const key = menuCode || menuName;
      if (!key) continue;
      if (!menuMap.has(key)) menuMap.set(key, { menuName: menuName || menuCode, parts: [] });
      const entry = menuMap.get(key);
      if (!entry.parts.includes(ingText)) entry.parts.push(ingText);
    }
  }
  return [...menuMap.values()].sort((a, b) => a.menuName.localeCompare(b.menuName, 'ko'));
}

/* ── 시트 렌더러 ─────────────────────────────────────────── */

function Sheet1({ rows }) {
  if (!rows.length) return <div className="origin-result-empty">원산지 데이터가 없습니다. 식자재 관리에서 원산지를 입력해주세요.</div>;
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
          <tr><th>표시품목</th><th>원산지</th><th>음식명</th></tr>
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
          <tr><th>재료명</th><th>표시품목</th><th>원산지</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.ingredientName}</td>
              <td>{r.displayName}</td>
              <td>{r.originCountry}</td>
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

/* ── 메인 컴포넌트 ───────────────────────────────────────── */
const TABS = [
  { key: 'store',    label: '매장비치용' },
  { key: 'fridge',   label: '냉장고부착용' },
  { key: 'delivery', label: '배달플랫폼용' },
];

export default function OriginResult() {
  const [origins,    setOrigins]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('store');
  const [exporting,  setExporting]  = useState(false);

  useEffect(() => {
    (async () => {
      await initDB();
      const [ings, masters, groups, edges, pizzaRecs, personalRecs, sideRecs, setRecs, oldRecs] = await Promise.all([
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
      const detailRecipes = [
        ...pizzaRecs.map(r => ({ ...r, category: '피자' })),
        ...personalRecs.map(r => ({ ...r, category: '1인피자' })),
        ...sideRecs.map(r => ({ ...r, category: '사이드' })),
        ...setRecs.map(r => ({ ...r, category: '세트박스' })),
      ];
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: masters, detailRecipes, oldRecipes: oldRecs, groups, edges,
      });
      const exMasters = masters.filter(m => m.excludeFromOrigin);
      const excludedMenuCodes = new Set(exMasters.map(m => m.menuCode).filter(Boolean));
      const excludedMenuNames = new Set(exMasters.map(m => (m.menuName || '').trim()).filter(Boolean));
      setOrigins(buildOriginsFromIngredients(ings, ingredientToMenus, excludedMenuCodes, excludedMenuNames));
    })().catch(console.error).finally(() => setLoading(false));
  }, []);

  const sheet1 = useMemo(() => buildSheet1(origins), [origins]);
  const sheet2 = useMemo(() => buildSheet2(origins), [origins]);
  const sheet3 = useMemo(() => buildSheet3(origins), [origins]);

  async function handleExcel() {
    if (!origins.length) { showToast('원산지 데이터가 없습니다', 'warn'); return; }
    setExporting(true);
    try {
      await exportOriginToExcel({ sheet1, sheet2, sheet3 });
      showToast('엑셀 다운로드 완료', 'ok');
    } catch (e) {
      showToast('엑셀 출력 실패: ' + e.message, 'err');
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="origin-result-empty">불러오는 중…</div>;

  return (
    <div className="origin-result-wrap">
      {/* 탭 */}
      <div className="origin-result-tabs">
        {TABS.map(t => (
          <button key={t.key}
            className={`origin-result-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="origin-result-actions">
        <button className="origin-result-btn" onClick={() => window.print()}>🖨 인쇄</button>
        <button className="origin-result-btn primary" onClick={handleExcel} disabled={exporting}>
          {exporting ? '출력 중…' : '⬇ 엑셀 다운로드'}
        </button>
      </div>

      {/* 표 */}
      {tab === 'store'    && <Sheet1 rows={sheet1} />}
      {tab === 'fridge'   && <Sheet2 rows={sheet2} />}
      {tab === 'delivery' && <Sheet3 rows={sheet3} />}
    </div>
  );
}
