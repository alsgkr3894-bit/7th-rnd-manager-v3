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
import './origin-result.css';

/**
 * 식자재 원산지 + 레시피 매핑 → 기존 origins 형식으로 변환
 * buildSheet1/2/3이 그대로 동작하도록 호환 어댑터.
 */
function buildOriginsFromIngredients(ingredients, ingredientToMenus) {
  const result = [];
  for (const ing of ingredients) {
    if (!ing.origin?.country || ing.discontinued || ing.excluded) continue;
    const codeKey  = ing.productCode ? `code:${ing.productCode}` : null;
    const nameKey  = `name:${(ing.ingredientName || '').trim().toLowerCase().replace(/\s+/g, '')}`;
    const byCode   = codeKey ? (ingredientToMenus.get(codeKey) || new Map()) : new Map();
    const byName   = ingredientToMenus.get(nameKey) || new Map();
    const merged   = new Map([...byName, ...byCode]);

    const menuCodes = [...merged.entries()].map(([menuCode, meta]) => ({ menuCode, menuName: meta.menuName }));
    result.push({
      id:             ing.id,
      ingredientId:   ing.id,
      ingredientName: ing.ingredientName,
      productCode:    ing.productCode || null,
      displayName:    ing.origin.displayName || ing.ingredientName,
      originCountry:  ing.origin.country,
      originRegion:   ing.origin.region || '',
      menuCodes,
      menuCode:       menuCodes[0]?.menuCode || '',
      menuName:       menuCodes[0]?.menuName || '',
      items: [{
        displayName:   ing.origin.displayName || ing.ingredientName,
        originCountry: ing.origin.country,
        originRegion:  ing.origin.region || '',
      }],
    });
  }
  return result;
}

/* ── 고정 텍스트 ─────────────────────────────────────────── */
const LEGAL_ITEMS =
  '원산지 표시항목(29개 품목) : 쇠고기, 돼지고기, 닭고기, 오리고기, 양고기, 염소고기, 쌀, 배추김치, 콩, ' +
  '넙치, 조피볼락, 참돔, 미꾸라지, 뱀장어, 낙지, 명태, 고등어, 갈치, 오징어, 꽃게, ' +
  '참조기, 다랑어, 아귀, 주꾸미, 가리비, 우렁쉥이, 전복, 방어, 부세';

const PIZZA_COMMON =
  '피자공통 - 도우(밀 : 미국산, 캐나다산, 흑미 : 국내산),\n' +
  '씬바사삭(밀 : 말레이시아산, 그레인 : 미국산, 캐나다산, 호주산, 흑미 : 태국산),\n' +
  '치즈블렌드(까망베르치즈 : 덴마크산, 모짜렐라치즈 : 덴마크산, 미국산, 고다치즈 : 네덜란드산)';

const NOTICE = '※ 재료 수급에 따라 원산지가 다소 변경 될 수 있습니다.';

const SUB_ORDER = ['프리미엄 스페셜', '프리미엄', '오리지널', '하프앤하프', '1인피자', '사이드', '소스', '기타'];

const SUB_CSS = {
  '프리미엄 스페셜': 'cat-ps',
  '프리미엄':        'cat-pr',
  '오리지널':        'cat-or',
  '하프앤하프':      'cat-hh',
  '1인피자':         'cat-one',
};

/* ── 유틸 ────────────────────────────────────────────────── */
function getSubCat(row) {
  if (row.menuCode) {
    const p = row.menuCode.toUpperCase().split('-');
    const map = { PS: '프리미엄 스페셜', PR: '프리미엄', OR: '오리지널', HH: '하프앤하프', ONE: '1인피자' };
    if (map[p[1]]) return map[p[1]];
  }
  return row.subCategory || row.category || '기타';
}

function toIngText(row) {
  const items = row.items?.length
    ? row.items
    : [{ displayName: row.displayName, originCountry: row.originCountry }];
  const inner = items
    .filter(it => it.displayName || it.originCountry)
    .map(it => [it.displayName, it.originCountry].filter(Boolean).join(':'))
    .join(', ');
  const name = row.ingredientName || '';
  return name ? `${name}(${inner})` : inner;
}

function getDate() {
  return new Date().toISOString().slice(0, 7).replace('-', '.');
}

/* ── 데이터 변환 ─────────────────────────────────────────── */
function buildSheet1(origins) {
  // 엑셀 출력(fillSheet1)과 동일한 그룹핑 — menuCodes 펼침 + (음식명||ingredientId) 키 + parts 중복 제거.
  // (preview와 excel의 행 병합/분해가 어긋나지 않도록 같은 로직을 사용한다)
  const menuMap = new Map();
  for (const row of origins) {
    const links = row.menuCodes?.length
      ? row.menuCodes
      : [{ menuCode: row.menuCode || '', menuName: row.menuName || row.ingredientName || '' }];
    for (const { menuCode, menuName } of links) {
      const displayName = menuName || row.ingredientName || menuCode || '';
      const key = `${displayName}||${row.ingredientId ?? row.ingredientName ?? ''}`;
      if (!menuMap.has(key)) {
        menuMap.set(key, { subCat: getSubCat({ ...row, menuCode }), menuName: displayName, parts: [] });
      }
      const entry = menuMap.get(key);
      const ingText = toIngText(row);
      if (!entry.parts.includes(ingText)) entry.parts.push(ingText);
    }
  }

  const rows = [...menuMap.values()].sort((a, b) => {
    const ia = SUB_ORDER.indexOf(a.subCat), ib = SUB_ORDER.indexOf(b.subCat);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  // 중분류별 그룹 (rowSpan 계산용)
  const groups = [];
  let cur = null;
  for (const r of rows) {
    if (!cur || cur.subCat !== r.subCat) { cur = { subCat: r.subCat, rows: [] }; groups.push(cur); }
    cur.rows.push(r);
  }
  return groups;
}

function buildSheet2(origins) {
  const itemMap = new Map();
  for (const row of origins) {
    const menuName = row.menuName || row.ingredientName || '';
    const ingName  = row.ingredientName || '';
    const items = row.items?.length
      ? row.items
      : [{ displayName: row.displayName, originCountry: row.originCountry }];

    for (const it of items) {
      if (!it.displayName && !it.originCountry) continue;
      const key = `${it.displayName || ''}||${it.originCountry || ''}`;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          displayLabel: ingName ? `${it.displayName}(${ingName})` : (it.displayName || ''),
          originCountry: it.originCountry || '',
          menus: new Set(),
        });
      }
      if (menuName) itemMap.get(key).menus.add(menuName);
    }
  }
  return [...itemMap.values()];
}

function buildSheet3(origins) {
  return origins.map(row => {
    const items = row.items?.length
      ? row.items
      : [{ displayName: row.displayName, originCountry: row.originCountry }];
    const valid = items.filter(it => it.displayName || it.originCountry);
    return {
      foodName:    row.menuName || row.ingredientName || '',
      displayItem: valid.map(it => it.displayName).filter(Boolean).join(', '),
      origin:      valid.map(it => [it.displayName, it.originCountry].filter(Boolean).join(':')).join(' / '),
    };
  });
}

/* ── 시트 렌더러 ─────────────────────────────────────────── */
function Sheet1({ groups }) {
  if (!groups.length) return <div className="origin-result-empty">원산지 데이터가 없습니다. 원산지 정보 페이지에서 먼저 등록해주세요.</div>;
  return (
    <div id="origin-print-area">
      <div className="origin-result-title">원산지 표기</div>
      <div className="origin-info-header">{LEGAL_ITEMS}</div>
      <div style={{ display: 'flex', border: '1px solid #333', borderTop: 'none', borderBottom: 'none' }}>
        <div className="origin-info-common" style={{ flex: 1, border: 'none' }}>{PIZZA_COMMON}</div>
        <div style={{ borderLeft: '1px solid #333', padding: '8px 12px', fontSize: 12, color: '#555', whiteSpace: 'nowrap', display: 'flex', alignItems: 'flex-start' }}>{getDate()}</div>
      </div>
      <table className="origin-result-table origin-info-table">
        <colgroup>
          <col className="col-cat" />
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
          {groups.map(g =>
            g.rows.map((r, i) => (
              <tr key={`${g.subCat}-${i}`}>
                {i === 0 && (
                  <td rowSpan={g.rows.length} className={`cat-cell ${SUB_CSS[g.subCat] || 'cat-side'}`}>
                    {g.subCat}
                  </td>
                )}
                <td>{r.menuName}</td>
                <td>{r.parts.join(', ')}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="origin-result-notice">{NOTICE}</div>
    </div>
  );
}

function Sheet2({ rows }) {
  if (!rows.length) return <div className="origin-result-empty">원산지 데이터가 없습니다.</div>;
  return (
    <div id="origin-print-area">
      <div className="origin-result-title large">원산지 표시판</div>
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
            <th>메뉴명</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.displayLabel}</td>
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

function Sheet3({ rows }) {
  if (!rows.length) return <div className="origin-result-empty">원산지 데이터가 없습니다.</div>;
  return (
    <div id="origin-print-area">
      <div className="origin-result-title large">원산지 표시판</div>
      <table className="origin-result-table origin-fridge-table">
        <colgroup>
          <col className="col-food" />
          <col className="col-item" />
          <col className="col-origin" />
        </colgroup>
        <thead>
          <tr>
            <th>음식명</th>
            <th>표시품목</th>
            <th>원산지</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.foodName}</td>
              <td>{r.displayItem}</td>
              <td>{r.origin}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="origin-result-notice large">{NOTICE}</div>
    </div>
  );
}

/* ── 메인 컴포넌트 ───────────────────────────────────────── */
const TABS = [
  { key: 'info',   label: '원산지정보' },
  { key: 'sign',   label: '원산지표지판' },
  { key: 'fridge', label: '냉장고부착용' },
];

export default function OriginResult() {
  const [origins, setOrigins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('info');
  const [exporting, setExporting] = useState(false);

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
      setOrigins(buildOriginsFromIngredients(ings, ingredientToMenus));
    })().catch(console.error).finally(() => setLoading(false));
  }, []);

  const sheet1 = useMemo(() => buildSheet1(origins), [origins]);
  const sheet2 = useMemo(() => buildSheet2(origins), [origins]);
  const sheet3 = useMemo(() => buildSheet3(origins), [origins]);

  function handlePrint() {
    window.print();
  }

  async function handleExcel() {
    if (!origins.length) return;
    setExporting(true);
    try {
      await exportOriginToExcel(origins);
    } catch (e) {
      alert('엑셀 출력 실패: ' + e.message);
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
        <button className="origin-result-btn" onClick={handlePrint}>🖨 인쇄</button>
        <button className="origin-result-btn primary" onClick={handleExcel} disabled={exporting}>
          {exporting ? '출력 중…' : '⬇ 엑셀 다운로드'}
        </button>
      </div>

      {/* 표 */}
      {tab === 'info'   && <Sheet1 groups={sheet1} />}
      {tab === 'sign'   && <Sheet2 rows={sheet2} />}
      {tab === 'fridge' && <Sheet3 rows={sheet3} />}
    </div>
  );
}
