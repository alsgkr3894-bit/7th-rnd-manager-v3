'use client';
import { useEffect, useState, useMemo } from 'react';
import { initDB } from '@/lib/db';
import { getAllMenuRefs, getRawValueMap, getAllEdges, getAllSetCompositions } from '@/lib/nutrition/values/store';
import { getAllMenuMaster } from '@/lib/menu-master';
import { getAllIngredients } from '@/lib/ingredient';
import { getAllRecipeGroups } from '@/lib/cost/recipe-groups/store';
import { getAllPizzaRecipes } from '@/lib/cost/pizza-detail';
import { getAllPersonalRecipes } from '@/lib/cost/personal-detail';
import { getAllSideRecipes } from '@/lib/cost/side-detail';
import { getAllSetRecipes } from '@/lib/cost/set-detail';
import { getAllRecipes } from '@/lib/recipe';
import { buildIngredientMenuMap } from '@/lib/cost/ingredient-menu-map';
import { tagDetailRecipes } from '@/lib/cost/recipe-categories';
import { buildMenuAllergenMap } from '@/lib/nutrition/allergen/aggregate';
import {
  buildPizzaSheet, buildToppingSheet, buildSideSheet,
  buildSetHalfSheet, buildBeverageSheet, LABEL_COLS,
} from '@/lib/nutrition/label/build';
import { exportNutritionLabelToExcel } from '@/lib/nutrition/label/export';
import { printNutritionLabelAll } from '@/lib/nutrition/label/print';
import { showToast } from '@/components/Toast';
import './origin-result.css';

const SUB_TABS = [
  { key: 'pizza',   label: '피자' },
  { key: 'topping', label: '추가토핑' },
  { key: 'side',    label: '사이드·파스타' },
  { key: 'set',     label: '세트박스·하프앤하프' },
  { key: 'drink',   label: '음료' },
];

const COL_STYLE = { textAlign: 'right', minWidth: 70, fontSize: 12, padding: '6px 8px' };
const HEADER_STYLE = { ...COL_STYLE, background: '#f0f0f0', fontWeight: 700, fontSize: 11 };

export default function NutritionLabelResult() {
  const [tab, setTab] = useState('pizza');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [pizzaSheet,   setPizzaSheet]   = useState([]);
  const [toppingSheet, setToppingSheet] = useState([]);
  const [sideSheet,    setSideSheet]    = useState([]);
  const [setHalfSheet, setSetHalfSheet] = useState([]);
  const [beverageSheet,setBeverageSheet]= useState([]);

  useEffect(() => {
    (async () => {
      await initDB();
      const [menuRefs, rawMap, edgeList, setComps, masters,
             ings, groups, pizzaRecs, personalRecs, sideRecs, setRecs, oldRecs] = await Promise.all([
        getAllMenuRefs(), getRawValueMap(), getAllEdges(), getAllSetCompositions(), getAllMenuMaster(),
        getAllIngredients(), getAllRecipeGroups(),
        getAllPizzaRecipes(), getAllPersonalRecipes(), getAllSideRecipes(), getAllSetRecipes(), getAllRecipes(),
      ]);

      const masterByCode = Object.fromEntries(masters.map(m => [m.menuCode, m]));
      const edgeMap = Object.fromEntries(edgeList.map(e => [e.edgeCode, e]));

      // 알레르기 집계
      const detailRecipes = tagDetailRecipes(pizzaRecs, personalRecs, sideRecs, setRecs);
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: masters,
        detailRecipes,
        oldRecipes: oldRecs,
        groups,
        edges: [],
      });
      const menuAllergenMap = buildMenuAllergenMap({ ingredients: ings, ingredientToMenus });

      const ctx = { menus: menuRefs, rawMap, edgeMap, masterByCode, menuAllergenMap, setComps };
      setPizzaSheet(buildPizzaSheet(ctx));
      setToppingSheet(buildToppingSheet(ctx));
      setSideSheet(buildSideSheet(ctx));
      setSetHalfSheet(buildSetHalfSheet(ctx));
      setBeverageSheet(buildBeverageSheet(ctx));
    })().catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleExcel() {
    setExporting(true);
    try {
      await exportNutritionLabelToExcel({ pizzaSheet, toppingSheet, sideSheet, setHalfSheet, beverageSheet });
      showToast('엑셀 다운로드 완료', 'ok');
    } catch (e) {
      showToast('엑셀 출력 실패: ' + e.message, 'err');
    } finally {
      setExporting(false);
    }
  }

  function handlePdf() {
    printNutritionLabelAll({ pizzaSheet, toppingSheet, sideSheet, setHalfSheet, beverageSheet });
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
      {/* 서브탭 */}
      <div className="origin-result-tabs origin-result-subtabs">
        {SUB_TABS.map(t => (
          <button key={t.key}
            className={`origin-result-tab origin-result-subtab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 액션 */}
      <div className="origin-result-actions">
        <button className="origin-result-btn" onClick={handlePdf}>🖨 PDF 통합 출력</button>
        <button className="origin-result-btn primary" onClick={handleExcel} disabled={exporting}>
          {exporting ? '출력 중…' : '⬇ 엑셀 통합 다운로드'}
        </button>
      </div>

      {/* 탭 내용 */}
      <div id="origin-print-area">
        {tab === 'pizza'   && <PizzaTable rows={pizzaSheet} />}
        {tab === 'topping' && <SimpleTable title="추가토핑" rows={toppingSheet} />}
        {tab === 'side'    && <SimpleTable title="사이드·파스타" rows={sideSheet} />}
        {tab === 'set'     && <SetHalfTable rows={setHalfSheet} />}
        {tab === 'drink'   && <SimpleTable title="음료" rows={beverageSheet} />}
      </div>
    </div>
  );
}

/* ── 하위 렌더러 ─────────────────────────────────────────────── */

function PizzaTable({ rows }) {
  if (!rows.length) return <Empty msg="피자 영양성분 데이터가 없어요. 베이스 영양성분을 먼저 입력해주세요." />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="origin-result-title large">영양성분표 (피자) — 150g 기준</div>
      <table className="origin-result-table" style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 160 }} />
          <col style={{ width: 90 }} />
          <col style={{ width: 40 }} />
          {LABEL_COLS.map(c => <col key={c.key} style={{ width: 75 }} />)}
          <col style={{ width: 220 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={HEADER_STYLE}>메뉴명</th>
            <th style={HEADER_STYLE}>크러스트</th>
            <th style={HEADER_STYLE}>L/R</th>
            {LABEL_COLS.map(c => (
              <th key={c.key} style={HEADER_STYLE}>{c.label}<br /><span style={{ fontWeight: 400, fontSize: 9 }}>({c.unit})</span></th>
            ))}
            <th style={HEADER_STYLE}>함유알레르기</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ menuName, rows: crustRows }) =>
            crustRows.map((r, i) => (
              <tr key={`${menuName}-${r.crustLabel}-${r.side}`}>
                {i === 0 && (
                  <td rowSpan={crustRows.length} style={{ fontWeight: 700, verticalAlign: 'middle', padding: '6px 8px', fontSize: 13, borderRight: '1px solid #ccc' }}>
                    {menuName}
                  </td>
                )}
                <td style={{ padding: '5px 8px', fontSize: 12 }}>{r.crustLabel}</td>
                <td style={{ padding: '5px 6px', fontSize: 11, textAlign: 'center', color: '#666' }}>{r.side}</td>
                {LABEL_COLS.map(c => (
                  <td key={c.key} style={COL_STYLE}>
                    {(r[c.key] === '' || r[c.key] == null) ? <span style={{ color: '#aaa' }}>—</span> : r[c.key]}
                  </td>
                ))}
                <td style={{ padding: '5px 8px', fontSize: 11 }}>{r.allergen || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SimpleTable({ title, rows }) {
  if (!rows.length) return <Empty msg={`${title} 영양성분 데이터가 없어요.`} />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="origin-result-title large">{`영양성분표 (${title})`}</div>
      <table className="origin-result-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ ...HEADER_STYLE, textAlign: 'left', width: 200 }}>메뉴명</th>
            {LABEL_COLS.map(c => (
              <th key={c.key} style={HEADER_STYLE}>{c.label}<br /><span style={{ fontWeight: 400, fontSize: 9 }}>({c.unit})</span></th>
            ))}
            <th style={{ ...HEADER_STYLE, textAlign: 'left' }}>함유알레르기</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ padding: '6px 8px', fontWeight: 600, fontSize: 13 }}>{r.menuName}</td>
              {LABEL_COLS.map(c => (
                <td key={c.key} style={COL_STYLE}>
                  {(r[c.key] === '' || r[c.key] == null || r[c.key] === '—') ? <span style={{ color: '#aaa' }}>—</span> : r[c.key]}
                </td>
              ))}
              <td style={{ padding: '6px 8px', fontSize: 11 }}>{r.allergen || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SetHalfTable({ rows }) {
  if (!rows.length) return <Empty msg="세트/하프앤하프 데이터가 없어요." />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="origin-result-title large">영양성분표 (세트박스·하프앤하프) — 1회중량 150g 기준</div>
      <table className="origin-result-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ ...HEADER_STYLE, textAlign: 'left', width: 200 }}>메뉴명</th>
            <th style={HEADER_STYLE}>1회중량(g)</th>
            <th style={HEADER_STYLE}>최소열량(kcal)</th>
            <th style={HEADER_STYLE}>최대열량(kcal)</th>
            <th style={{ ...HEADER_STYLE, textAlign: 'left' }}>함유알레르기</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ padding: '6px 8px', fontWeight: 600, fontSize: 13 }}>{r.menuName}</td>
              <td style={COL_STYLE}>{r.weight}</td>
              <td style={COL_STYLE}>{r.minKcal === '—' ? <span style={{ color: '#aaa' }}>—</span> : r.minKcal}</td>
              <td style={COL_STYLE}>{r.maxKcal === '—' ? <span style={{ color: '#aaa' }}>—</span> : r.maxKcal}</td>
              <td style={{ padding: '6px 8px', fontSize: 11 }}>{r.allergen || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div className="origin-result-empty" style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}>
      {msg}
    </div>
  );
}
