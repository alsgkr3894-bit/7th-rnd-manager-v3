'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { initDB } from '@/lib/db';
import {
  getAllMenuRefs,
  getRawValueMap,
  getAllEdges,
  getAllSetCompositions,
} from '@/lib/nutrition/values/store';
import { getAllEdges as getCostEdges } from '@/lib/cost/edge-dough';
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
import { buildEdgeAllergenMap, buildMenuAllergenMap } from '@/lib/nutrition/allergen/aggregate';
import { extractExcludedMenuSets } from '@/lib/nutrition/menu-exclusion';
import { loadMenuNames, applyMenuName } from '@/lib/nutrition/menu-name-override';
import { resolveNutritionGroup } from '@/lib/nutrition/menu-group';
import { MENU_ORDER_KEY, loadOrder } from '@/lib/nutrition/order';
import { loadSliceCounts, saveSliceCounts } from '@/lib/nutrition/slice-config';
import { SliceConfigModal } from '@/components/nutrition/SliceConfigModal';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import {
  buildPizzaSheet,
  buildPizzaSliceSheet,
  buildToppingSheet,
  buildSideSheet,
  buildSetHalfSheet,
  buildBeverageSheet,
  sortNutritionLabelMenus,
  LABEL_COLS,
} from '@/lib/nutrition/label/build';
import { exportNutritionLabelToExcel } from '@/lib/nutrition/label/export';
import { printNutritionLabelAll } from '@/lib/nutrition/label/print';
import { showToast } from '@/components/Toast';
import './origin-result.css';

const SUB_TABS = [
  { key: 'pizza', label: '피자' },
  { key: 'side', label: '사이드·파스타' },
  { key: 'topping', label: '추가토핑' },
  { key: 'set', label: '세트박스·하프앤하프' },
  { key: 'drink', label: '음료' },
];

const COL_STYLE = { textAlign: 'right', minWidth: 70, fontSize: 12, padding: '6px 8px' };
const HEADER_STYLE = { ...COL_STYLE, background: '#f0f0f0', fontWeight: 700, fontSize: 11 };
const EMPTY_DASH_STYLE = { color: '#aaa' };

// 음료 컬럼 — 1회중량(g) 대신 용량(ml)
const BEVERAGE_COLS = LABEL_COLS.map(c =>
  c.key === 'weight' ? { ...c, label: '용량', unit: 'ml' } : c
);

function ValueText({ value }) {
  const text = asDisplayText(value);
  if (!text || text === '—') return <span style={EMPTY_DASH_STYLE}>—</span>;
  return text;
}

export default function NutritionLabelResult() {
  const [tab, setTab] = useState('pizza');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [pizzaSheet, setPizzaSheet] = useState([]);
  const [pizzaSliceSheet, setPizzaSliceSheet] = useState([]);
  const [toppingSheet, setToppingSheet] = useState([]);
  const [sideSheet, setSideSheet] = useState([]);
  const [setHalfSheet, setSetHalfSheet] = useState([]);
  const [beverageSheet, setBeverageSheet] = useState([]);

  const [pizzaView, setPizzaView] = useState('150g'); // '150g' | 'slice'
  const [sliceCounts, setSliceCounts] = useState({});
  const [sliceModalOpen, setSliceModalOpen] = useState(false);
  const [labelContext, setLabelContext] = useState(null);
  const ctxRef = useRef(null); // { menus, rawMap, edgeMap, masterByCode, menuAllergenMap, edgeAllergenMap }

  // 조각 시트 재계산 (sliceCounts 변경 시 DB 재조회 없이)
  const rebuildSliceSheet = counts => {
    const c = ctxRef.current;
    if (!c) return;
    setPizzaSliceSheet(buildPizzaSliceSheet({ ...c, sliceCounts: counts }));
  };

  // 피자 그룹 메뉴 (조각수 설정 모달용)
  const pizzaMenusForModal = useMemo(() => {
    if (!labelContext) return [];
    return labelContext.menus.filter(
      m => resolveNutritionGroup(m, labelContext.masterByCode) === '피자'
    );
  }, [labelContext]);

  useEffect(() => {
    setSliceCounts(loadSliceCounts());
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      await initDB();
      const [
        menuRefs,
        rawMap,
        edgeList,
        setComps,
        masters,
        ings,
        groups,
        costEdges,
        pizzaRecs,
        personalRecs,
        sideRecs,
        setRecs,
        oldRecs,
      ] = await Promise.all([
        getAllMenuRefs(),
        getRawValueMap(),
        getAllEdges(),
        getAllSetCompositions(),
        getAllMenuMaster(),
        getAllIngredients(),
        getAllRecipeGroups(),
        getCostEdges(),
        getAllPizzaRecipes(),
        getAllPersonalRecipes(),
        getAllSideRecipes(),
        getAllSetRecipes(),
        getAllRecipes(),
      ]);

      const masterByCode = Object.fromEntries(masters.map(m => [m.menuCode, m]));
      const edgeMap = Object.fromEntries(edgeList.map(e => [e.edgeCode, e]));

      // 알레르기 집계 — 메뉴 기본 알레르기와 엣지별 알레르기를 분리해 행별로 합산
      const detailRecipes = tagDetailRecipes(pizzaRecs, personalRecs, sideRecs, setRecs);
      const { ingredientToMenus } = buildIngredientMenuMap({
        menuMasters: masters,
        detailRecipes,
        oldRecipes: oldRecs,
        groups,
        edges: [],
      });
      const menuAllergenMap = buildMenuAllergenMap({ ingredients: ings, ingredientToMenus });
      const edgeAllergenMap = buildEdgeAllergenMap({ ingredients: ings, edges: costEdges });

      // 출력 메뉴 전처리: 제외 필터 → 메뉴명 오버라이드 → 피자/사이드 우선 가나다 정렬
      const { excludedMenuCodes, excludedMenuNames } = extractExcludedMenuSets(masters);
      const nameOverrides = loadMenuNames();
      const menuOrder = loadOrder(MENU_ORDER_KEY);
      const orderedMenus = sortNutritionLabelMenus(
        menuRefs
          .filter(
            m =>
              !excludedMenuCodes.has(m.menuCode) &&
              !excludedMenuNames.has((m.menuName || '').trim())
          )
          .map(m => ({ ...m, menuName: applyMenuName(m.menuCode, m.menuName, nameOverrides) })),
        masterByCode,
        menuOrder
      );

      const ctx = {
        menus: orderedMenus,
        rawMap,
        edgeMap,
        masterByCode,
        menuAllergenMap,
        edgeAllergenMap,
        setComps,
        menuOrder,
      };
      if (!alive) return;
      ctxRef.current = ctx;
      setLabelContext(ctx);
      setPizzaSheet(buildPizzaSheet(ctx));
      setToppingSheet(buildToppingSheet(ctx));
      setSideSheet(buildSideSheet(ctx));
      setSetHalfSheet(buildSetHalfSheet(ctx));
      setBeverageSheet(buildBeverageSheet(ctx));
      setPizzaSliceSheet(buildPizzaSliceSheet({ ...ctx, sliceCounts: loadSliceCounts() }));
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

  async function handleExcel() {
    setExporting(true);
    try {
      await exportNutritionLabelToExcel({
        pizzaSheet,
        pizzaSliceSheet,
        toppingSheet,
        sideSheet,
        setHalfSheet,
        beverageSheet,
      });
      showToast('엑셀 다운로드 완료', 'ok');
    } catch (e) {
      showToast('엑셀 출력 실패: ' + e.message, 'err');
    } finally {
      setExporting(false);
    }
  }

  function handlePdf() {
    printNutritionLabelAll({
      pizzaSheet,
      pizzaSliceSheet,
      toppingSheet,
      sideSheet,
      setHalfSheet,
      beverageSheet,
    });
  }

  function applySliceCounts(next) {
    setSliceCounts(next);
    saveSliceCounts(next);
    rebuildSliceSheet(next);
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
      {/* 서브탭 */}
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

      {/* 액션 */}
      <div className="origin-result-actions">
        <button className="origin-result-btn" onClick={handlePdf}>
          🖨 PDF 통합 출력
        </button>
        <button className="origin-result-btn primary" onClick={handleExcel} disabled={exporting}>
          {exporting ? '출력 중…' : '⬇ 엑셀 통합 다운로드'}
        </button>
      </div>

      {/* 피자 뷰 토글 + 조각수 설정 */}
      {tab === 'pizza' && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 10,
            flexWrap: 'wrap',
          }}
        >
          {['150g', 'slice'].map(v => (
            <button
              key={v}
              className={'chip ' + (pizzaView === v ? 'active' : '')}
              onClick={() => setPizzaView(v)}
            >
              {v === '150g' ? '150g 기준' : '조각 기준'}
            </button>
          ))}
          {pizzaView === 'slice' && (
            <button
              className="btn sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setSliceModalOpen(true)}
            >
              ⚙ 조각수 설정
            </button>
          )}
        </div>
      )}

      {/* 탭 내용 */}
      <div id="origin-print-area">
        {tab === 'pizza' &&
          (pizzaView === 'slice' ? (
            <PizzaSliceTable rows={pizzaSliceSheet} />
          ) : (
            <PizzaTable rows={pizzaSheet} />
          ))}
        {tab === 'topping' && <SimpleTable title="추가토핑" rows={toppingSheet} />}
        {tab === 'side' && <SimpleTable title="사이드·파스타" rows={sideSheet} />}
        {tab === 'set' && <SetHalfTable rows={setHalfSheet} />}
        {tab === 'drink' && <SimpleTable title="음료" rows={beverageSheet} cols={BEVERAGE_COLS} />}
      </div>

      {sliceModalOpen && (
        <SliceConfigModal
          pizzaMenus={pizzaMenusForModal}
          masterByCode={ctxRef.current?.masterByCode || {}}
          counts={sliceCounts}
          onApply={applySliceCounts}
          onClose={() => setSliceModalOpen(false)}
        />
      )}
    </div>
  );
}

/* ── 하위 렌더러 ─────────────────────────────────────────────── */

function PizzaTable({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length)
    return <Empty msg="피자 영양성분 데이터가 없어요. 베이스 영양성분을 먼저 입력해주세요." />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="origin-result-title large">영양성분표 (피자) — 150g 기준</div>
      <table
        className="origin-result-table"
        style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}
      >
        <colgroup>
          <col style={{ width: 160 }} />
          <col style={{ width: 90 }} />
          <col style={{ width: 40 }} />
          {LABEL_COLS.map(c => (
            <col key={c.key} style={{ width: 75 }} />
          ))}
          <col style={{ width: 220 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={HEADER_STYLE}>메뉴명</th>
            <th style={HEADER_STYLE}>크러스트</th>
            <th style={HEADER_STYLE}>L/R</th>
            {LABEL_COLS.map(c => (
              <th key={c.key} style={HEADER_STYLE}>
                {c.label}
                <br />
                <span style={{ fontWeight: 400, fontSize: 9 }}>({c.unit})</span>
              </th>
            ))}
            <th style={HEADER_STYLE}>함유알레르기</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map(({ menuName, rows: crustRows }, groupIndex) => {
            const safeCrustRows = asObjectArray(crustRows);
            const displayMenuName = asDisplayText(menuName, `메뉴 ${groupIndex + 1}`);
            return safeCrustRows.map((r, i) => (
              <tr
                key={`${displayMenuName}-${asDisplayText(r.crustLabel)}-${asDisplayText(r.side)}-${i}`}
              >
                {i === 0 && (
                  <td
                    rowSpan={safeCrustRows.length}
                    style={{
                      fontWeight: 700,
                      verticalAlign: 'middle',
                      padding: '6px 8px',
                      fontSize: 13,
                      borderRight: '1px solid #ccc',
                    }}
                  >
                    {displayMenuName}
                  </td>
                )}
                <td style={{ padding: '5px 8px', fontSize: 12 }}>
                  {asDisplayText(r.crustLabel, '—')}
                </td>
                <td
                  style={{ padding: '5px 6px', fontSize: 11, textAlign: 'center', color: '#666' }}
                >
                  {asDisplayText(r.side, '—')}
                </td>
                {LABEL_COLS.map(c => (
                  <td key={c.key} style={COL_STYLE}>
                    <ValueText value={r[c.key]} />
                  </td>
                ))}
                <td style={{ padding: '5px 8px', fontSize: 11 }}>
                  {asDisplayText(r.allergen, '—')}
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

function PizzaSliceTable({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length)
    return (
      <Empty msg="피자 영양성분 데이터가 없어요. 베이스 영양성분(중량 포함)을 먼저 입력해주세요." />
    );
  const nutCols = LABEL_COLS.filter(c => c.key !== 'weight');

  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="origin-result-title large">영양성분표 (피자) — 조각 기준</div>
      <div style={{ fontSize: 11, color: '#888', margin: '0 0 6px' }}>
        ※ 한판 총중량 ÷ 조각수로 1조각 산출. 1조각이 100kcal 이상이면 1조각, 미만이면 2조각,
        2조각도 100kcal 이하면 3조각을 1회 제공량으로 표기. 중량 미입력 시 '—'.
      </div>
      <table
        className="origin-result-table"
        style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}
      >
        <colgroup>
          <col style={{ width: 150 }} />
          <col style={{ width: 84 }} />
          <col style={{ width: 36 }} />
          <col style={{ width: 52 }} />
          <col style={{ width: 64 }} />
          <col style={{ width: 64 }} />
          {nutCols.map(c => (
            <col key={c.key} style={{ width: 70 }} />
          ))}
          <col style={{ width: 200 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={HEADER_STYLE}>메뉴명</th>
            <th style={HEADER_STYLE}>크러스트</th>
            <th style={HEADER_STYLE}>L/R</th>
            <th style={HEADER_STYLE}>조각수</th>
            <th style={HEADER_STYLE}>1회제공</th>
            <th style={HEADER_STYLE}>
              중량
              <br />
              <span style={{ fontWeight: 400, fontSize: 9 }}>(g)</span>
            </th>
            {nutCols.map(c => (
              <th key={c.key} style={HEADER_STYLE}>
                {c.label}
                <br />
                <span style={{ fontWeight: 400, fontSize: 9 }}>({c.unit})</span>
              </th>
            ))}
            <th style={HEADER_STYLE}>함유알레르기</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map(({ menuName, rows: crustRows }, groupIndex) => {
            const safeCrustRows = asObjectArray(crustRows);
            const displayMenuName = asDisplayText(menuName, `메뉴 ${groupIndex + 1}`);
            return safeCrustRows.map((r, i) => (
              <tr
                key={`${displayMenuName}-${asDisplayText(r.crustLabel)}-${asDisplayText(r.side)}-${i}`}
              >
                {i === 0 && (
                  <td
                    rowSpan={safeCrustRows.length}
                    style={{
                      fontWeight: 700,
                      verticalAlign: 'middle',
                      padding: '6px 8px',
                      fontSize: 13,
                      borderRight: '1px solid #ccc',
                    }}
                  >
                    {displayMenuName}
                  </td>
                )}
                <td style={{ padding: '5px 8px', fontSize: 12 }}>
                  {asDisplayText(r.crustLabel, '—')}
                </td>
                <td
                  style={{ padding: '5px 6px', fontSize: 11, textAlign: 'center', color: '#666' }}
                >
                  {asDisplayText(r.side, '—')}
                </td>
                <td style={{ ...COL_STYLE, textAlign: 'center' }}>
                  <ValueText value={r.slice} />
                </td>
                <td style={{ ...COL_STYLE, textAlign: 'center', fontWeight: 600 }}>
                  <ValueText value={r.servingLabel} />
                </td>
                <td style={COL_STYLE}>
                  <ValueText value={r.weight} />
                </td>
                {nutCols.map(c => (
                  <td key={c.key} style={COL_STYLE}>
                    <ValueText value={r[c.key]} />
                  </td>
                ))}
                <td style={{ padding: '5px 8px', fontSize: 11 }}>
                  {asDisplayText(r.allergen, '—')}
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}

function SimpleTable({ title, rows, cols = LABEL_COLS }) {
  const safeRows = asObjectArray(rows);
  const safeCols = asObjectArray(cols);
  if (!safeRows.length) return <Empty msg={`${title} 영양성분 데이터가 없어요.`} />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="origin-result-title large">{`영양성분표 (${title})`}</div>
      <table className="origin-result-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ ...HEADER_STYLE, textAlign: 'left', width: 200 }}>메뉴명</th>
            {safeCols.map(c => (
              <th key={c.key} style={HEADER_STYLE}>
                {c.label}
                <br />
                <span style={{ fontWeight: 400, fontSize: 9 }}>({c.unit})</span>
              </th>
            ))}
            <th style={{ ...HEADER_STYLE, textAlign: 'left' }}>함유알레르기</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.map((r, i) => (
            <tr key={r.menuCode || r.menuName || i}>
              <td style={{ padding: '6px 8px', fontWeight: 600, fontSize: 13 }}>
                {asDisplayText(r.menuName, `메뉴 ${i + 1}`)}
              </td>
              {safeCols.map(c => (
                <td key={c.key} style={COL_STYLE}>
                  <ValueText value={r[c.key]} />
                </td>
              ))}
              <td style={{ padding: '6px 8px', fontSize: 11 }}>{asDisplayText(r.allergen, '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SetHalfTable({ rows }) {
  const safeRows = asObjectArray(rows);
  if (!safeRows.length) return <Empty msg="세트/하프앤하프 데이터가 없어요." />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="origin-result-title large">
        영양성분표 (세트박스·하프앤하프) — 1회중량 150g 기준
      </div>
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
          {safeRows.map((r, i) => (
            <tr key={r.menuCode || r.menuName || i}>
              <td style={{ padding: '6px 8px', fontWeight: 600, fontSize: 13 }}>
                {asDisplayText(r.menuName, `메뉴 ${i + 1}`)}
              </td>
              <td style={COL_STYLE}>
                <ValueText value={r.weight} />
              </td>
              <td style={COL_STYLE}>
                <ValueText value={r.minKcal} />
              </td>
              <td style={COL_STYLE}>
                <ValueText value={r.maxKcal} />
              </td>
              <td style={{ padding: '6px 8px', fontSize: 11 }}>{asDisplayText(r.allergen, '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div
      className="origin-result-empty"
      style={{ padding: '40px 20px', textAlign: 'center', color: '#888' }}
    >
      {msg}
    </div>
  );
}
