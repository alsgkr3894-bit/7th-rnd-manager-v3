'use client';
import { useState, useEffect } from 'react';
import ReportBuilderShell, { OptGroup, Seg, Check } from '@/components/report/ReportBuilderShell';
import { makeFieldUpdater } from '@/lib/ui/form-state';
import { formatNumber, pad } from '@/lib/format';
import { Icon } from '@/components/icons';
import { initDB } from '@/lib/db/init';
import { getAllMenuPrices } from '@/lib/cost/menu-price/store';
import { getAllRecipes, buildUnitPriceMap, calcCostBySizes } from '@/lib/recipe';
import { getAllIngredients } from '@/lib/ingredient';
import { componentSubtotal } from '@/lib/cost/shared/calc';
import { getPizzaRecipeMap } from '@/lib/cost/pizza-detail';
import { getPersonalRecipeMap } from '@/lib/cost/personal-detail';
import { getSideRecipeMap } from '@/lib/cost/side-detail';
import { getSetRecipeMap } from '@/lib/cost/set-detail';
import { getAllEdges, edgeTotalCost } from '@/lib/cost/edge-dough';
import { getPriceFiles } from '@/lib/price';
import { getActiveBrand } from '@/lib/active-brand';
import { useDraftRestore } from '@/hooks/useDraftRestore';
import { getProfile } from '@/lib/profile';
import { isPizzaCategory } from '@/lib/menu-master/category-policy';

// ── 상수 ──────────────────────────────────────────────────────
const matchEdge = cat => cat === '엣지' || cat === '엣지&도우' || cat === '엣지 & 도우';
const stripName = s => (s || '').replace(/\s/g, '');

// 카테고리 순서: 원가마진표와 동일
const CAT_KEYS = ['피자', '1인피자', '세트박스', '사이드', '엣지'];

const CAT_META = {
  피자: { id: 'pizza', color: '#3182F6', label: '피자' },
  '1인피자': { id: 'personal', color: '#10B981', label: '1인피자' },
  세트박스: { id: 'set', color: '#EC4899', label: '세트박스' },
  사이드: { id: 'side', color: '#F59E0B', label: '사이드' },
  엣지: { id: 'edge', color: '#8B5CF6', label: '엣지 & 도우' },
};

const DRAFT_KEY = 'report_draft_cost';

// ── 원가 계산 헬퍼 ─────────────────────────────────────────────
const detailComponentCost = comps =>
  Array.isArray(comps) ? Math.round(comps.reduce((a, c) => a + componentSubtotal(c), 0)) : 0;

function detailStoreFor(rawCat, maps) {
  const c = rawCat || '';
  if (c === '1인피자') return maps.personal;
  if (c === '세트박스') return maps.set;
  if (c === '사이드' || c === '소스' || c === '음료') return maps.side;
  if (c === '피자' || c.startsWith('피자/')) return maps.pizza;
  return null;
}

function costForPrice(p, ctx) {
  if (matchEdge(p.category)) {
    const name = stripName(p.menuName);
    const edge = ctx.edges.find(
      e => stripName(e.edgeType) === name && (!p.size || p.size === '단일' || e.size === p.size)
    );
    return edge ? edgeTotalCost(edge) : 0;
  }
  const map = detailStoreFor(p.category, ctx.detailMaps);
  if (map && p.menuCode) {
    const rec = map.get(p.menuCode);
    if (rec) return detailComponentCost(rec.components);
  }
  const lr = ctx.recipeByName.get(p.menuName);
  if (lr) {
    const cm = calcCostBySizes(lr, ctx.upm);
    return cm[p.size] || cm[lr.sizes?.[0]?.label] || 0;
  }
  return 0;
}

// ── xlsx 빌더 (동적 import, 클라이언트 전용) ───────────────────
let _xlsxPromise = null;
async function loadXlsx() {
  if (!_xlsxPromise) _xlsxPromise = import('xlsx');
  return _xlsxPromise;
}

async function exportCostXlsx(periodLabel, activeCats) {
  const XLSX = await loadXlsx();
  const now = new Date();
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const periodPart = periodLabel.replace(
    /(\d+)년 (\d+)월/,
    (_, y, m) => `${y}년${m.padStart(2, '0')}월`
  );
  const wb = XLSX.utils.book_new();

  // 시트1: 카테고리 요약
  const summaryRows = [
    ['카테고리', '메뉴 수', '평균 원가율(%)', '최저(%)', '최고(%)', '위험 메뉴'],
    ...activeCats.map(([, c]) => {
      const rates = c.menus.filter(m => m.rate > 0).map(m => m.rate);
      const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
      return [
        c.label,
        c.menus.length,
        avg > 0 ? Math.round(avg * 10) / 10 : '',
        rates.length ? Math.round(Math.min(...rates) * 10) / 10 : '',
        rates.length ? Math.round(Math.max(...rates) * 10) / 10 : '',
        c.menus.filter(m => m.rate > 0).length,
      ];
    }),
  ];
  const sheet1 = XLSX.utils.aoa_to_sheet(summaryRows);
  sheet1['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, sheet1, '카테고리 요약');

  // 시트2: 메뉴 상세 (카테고리 내 menuCode 오름차순)
  const detailRows = [
    ['카테고리', '메뉴명', '판매가(원)', '원가(원)', '원가율(%)'],
    ...activeCats.flatMap(([, c]) =>
      [...c.menus]
        .sort((a, b) => (a.code || '~~~').localeCompare(b.code || '~~~', 'ko'))
        .map(m => [
          c.label,
          m.name,
          m.sale || '',
          m.cost || '',
          m.rate > 0 ? Math.round(m.rate * 10) / 10 : '',
        ])
    ),
  ];
  const sheet2 = XLSX.utils.aoa_to_sheet(detailRows);
  sheet2['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, sheet2, '메뉴 상세');

  XLSX.writeFile(wb, `${getActiveBrand().name}_${periodPart}_원가계산보고서_${dateStr}.xlsx`);
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
const NOW = new Date();
const _TM = { year: NOW.getFullYear(), month: NOW.getMonth() + 1 };
const _LM = {
  year: NOW.getMonth() === 0 ? NOW.getFullYear() - 1 : NOW.getFullYear(),
  month: NOW.getMonth() === 0 ? 12 : NOW.getMonth(),
};

export default function Page() {
  const [periodMode, setPeriodMode] = useState('month');
  const [year, setYear] = useState(NOW.getFullYear());
  const [month, setMonth] = useState(NOW.getMonth() + 1);
  const [riskThreshold, setRiskThreshold] = useState(35);
  const [cats, setCats] = useState({
    pizza: true,
    personal: true,
    side: true,
    set: true,
    edge: true,
  });
  const [opts, setOpts] = useState({
    summary: true,
    catTable: true,
    perCategory: true,
    riskList: true,
  });
  const updCat = makeFieldUpdater(setCats);
  const updOpt = makeFieldUpdater(setOpts);
  const [docFormat, setDocFormat] = useState({ pdf: true, excel: false });
  const updFmt = makeFieldUpdater(setDocFormat);
  const [dataError, setDataError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [costByCategory, setCostByCategory] = useState(() =>
    Object.fromEntries(
      Object.entries(CAT_META).map(([, m]) => [m.id, { label: m.label, color: m.color, menus: [] }])
    )
  );

  useDraftRestore(DRAFT_KEY, draft => {
    if (draft.periodMode) setPeriodMode(draft.periodMode);
    if (draft.year) setYear(draft.year);
    if (draft.month) setMonth(draft.month);
    if (draft.riskThreshold) setRiskThreshold(draft.riskThreshold);
    if (draft.cats) setCats(c => ({ ...c, ...draft.cats }));
    if (draft.opts) setOpts(o => ({ ...o, ...draft.opts }));
  });

  useEffect(() => {
    let ignore = false;

    setIsLoading(true);
    initDB()
      .then(async () => {
        try {
          const [
            prices,
            recipes,
            ingredients,
            pizzaMap,
            personalMap,
            sideMap,
            setMap,
            edges,
            priceFiles,
          ] = await Promise.all([
            getAllMenuPrices(),
            getAllRecipes(),
            getAllIngredients(),
            getPizzaRecipeMap(),
            getPersonalRecipeMap(),
            getSideRecipeMap(),
            getSetRecipeMap(),
            getAllEdges(),
            getPriceFiles(),
          ]);
          if (ignore) return;

          // 최신 단가 파일 기준 집계 기간 설정
          const latestFile = priceFiles[0];
          if (latestFile?.updateDate) {
            const d = new Date(latestFile.updateDate);
            if (!isNaN(d)) {
              setYear(d.getFullYear());
              setMonth(d.getMonth() + 1);
            }
          }

          if (prices.length === 0) {
            setIsLoading(false);
            return;
          }

          const recipeByName = new Map();
          for (const r of recipes) {
            if (r.menuName && !recipeByName.has(r.menuName)) recipeByName.set(r.menuName, r);
          }
          const ctx = {
            detailMaps: { pizza: pizzaMap, personal: personalMap, side: sideMap, set: setMap },
            edges,
            recipeByName,
            upm: buildUnitPriceMap(ingredients, new Map()),
          };

          const updated = {};
          for (const catLabel of CAT_KEYS) {
            const meta = CAT_META[catLabel];
            if (!meta) continue;
            const catPrices = prices.filter(p =>
              catLabel === '엣지'
                ? matchEdge(p.category)
                : catLabel === '피자'
                  ? isPizzaCategory(p.category, { includePersonal: false })
                  : p.category === catLabel
            );
            // 메뉴 오브젝트에 menuCode 포함(정렬·xlsx용)
            const menus = catPrices.map(p => {
              const cost = Math.round(costForPrice(p, ctx));
              const sale = p.price || 0;
              const rate = cost > 0 && sale > 0 ? (cost / sale) * 100 : 0;
              return {
                code: p.menuCode || '',
                name: p.size && p.size !== '단일' ? `${p.menuName} ${p.size}` : p.menuName,
                cost,
                sale,
                rate,
              };
            });
            // 카테고리 내 menuCode 오름차순 (마진표와 동일)
            menus.sort((a, b) => (a.code || '~~~').localeCompare(b.code || '~~~', 'ko'));
            updated[meta.id] = { label: meta.label, color: meta.color, menus };
          }
          setCostByCategory(updated);
          setDataError(null);
        } catch (err) {
          if (ignore) return;

          console.error('[cost report]', err);
          setDataError('메뉴 가격 데이터를 불러오는 중 오류가 발생했어요.');
        } finally {
          if (!ignore) setIsLoading(false);
        }
      })
      .catch(() => {
        if (ignore) return;

        setIsLoading(false);
        setDataError('데이터베이스에 연결할 수 없어요. 데이터를 먼저 업로드해 주세요.');
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const periodLabel = periodMode === 'year' ? `${year}년` : `${year}년 ${month}월`;

  // CAT_KEYS 순서 유지하면서 활성 카테고리 추출
  const activeCats = CAT_KEYS.map(k => CAT_META[k])
    .filter(m => cats[m.id])
    .map(m => [m.id, costByCategory[m.id] || { label: m.label, color: m.color, menus: [] }]);

  const catStats = activeCats.map(([k, c]) => {
    const rates = c.menus.filter(m => m.rate > 0).map(m => m.rate);
    const avg = rates.length ? rates.reduce((s, v) => s + v, 0) / rates.length : 0;
    const risk = c.menus.filter(m => m.rate >= riskThreshold).length;
    return {
      id: k,
      ...c,
      avg,
      min: rates.length ? Math.min(...rates) : 0,
      max: rates.length ? Math.max(...rates) : 0,
      risk,
      count: c.menus.length,
    };
  });

  const allMenus = activeCats.flatMap(([, c]) => c.menus);
  const totalCount = allMenus.length;
  const allAvg = totalCount ? allMenus.reduce((s, m) => s + m.rate, 0) / totalCount : 0;
  const allRisk = allMenus.filter(m => m.rate >= riskThreshold).length;
  const allMaxRate = totalCount ? Math.max(...allMenus.map(m => m.rate)) : 0;
  const riskMenus = activeCats
    .flatMap(([, c]) =>
      c.menus
        .filter(m => m.rate >= riskThreshold)
        .map(m => ({ ...m, catLabel: c.label, catColor: c.color }))
    )
    .sort((a, b) => b.rate - a.rate);

  const reportMeta = {
    period: periodLabel,
    name: `${periodLabel} 원가계산 종합 보고서`,
    options: { periodMode, year, month, riskThreshold, cats, opts },
  };

  const handleExcelExport = () => exportCostXlsx(periodLabel, activeCats);

  const yearOptions = [];
  const curY = new Date().getFullYear();
  for (let y = curY - 2; y <= curY; y++) yearOptions.push(y);

  return (
    <ReportBuilderShell
      breadcrumb={['보고서센터', '원가계산 보고서']}
      title="원가계산 보고서 생성"
      sub="5개 카테고리(피자·1인피자·세트박스·사이드·엣지&도우)의 종합 원가를 한 장에 모아요."
      kind="cost"
      exportNote="단가는 최신 제때 업로드 기준으로 고정됩니다."
      reportMeta={reportMeta}
      dataError={dataError}
      isLoading={isLoading}
      docFormat={docFormat}
      onExcelExport={handleExcelExport}
      options={
        <>
          <OptGroup label="집계 기준 기간">
            <Seg
              value={periodMode}
              onChange={setPeriodMode}
              options={[
                { value: 'month', label: '월 단위' },
                { value: 'year', label: '년 단위' },
              ]}
            />
            <div className="opt-period-row">
              <select
                className="period-select num"
                value={year}
                onChange={e => setYear(parseInt(e.target.value, 10))}
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
              {periodMode === 'month' && (
                <select
                  className="period-select num"
                  value={month}
                  onChange={e => setMonth(parseInt(e.target.value, 10))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>
                      {m}월
                    </option>
                  ))}
                </select>
              )}
            </div>
            {periodMode === 'month' && (
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button
                  className="btn sm"
                  onClick={() => {
                    setYear(_LM.year);
                    setMonth(_LM.month);
                  }}
                >
                  지난달
                </button>
                <button
                  className="btn sm"
                  onClick={() => {
                    setYear(_TM.year);
                    setMonth(_TM.month);
                  }}
                >
                  이번달
                </button>
              </div>
            )}
          </OptGroup>

          <OptGroup label="포함 카테고리" hint="체크된 카테고리만 종합 원가표에 포함돼요">
            <Check label="피자" value={cats.pizza} onChange={v => updCat('pizza', v)} />
            <Check label="1인피자" value={cats.personal} onChange={v => updCat('personal', v)} />
            <Check label="세트박스" value={cats.set} onChange={v => updCat('set', v)} />
            <Check label="사이드" value={cats.side} onChange={v => updCat('side', v)} />
            <Check label="엣지 & 도우" value={cats.edge} onChange={v => updCat('edge', v)} />
          </OptGroup>

          <OptGroup label="위험 메뉴 기준" hint="이 원가율을 초과하는 메뉴는 ⚠ 표시">
            <div className="threshold-bar">
              <input
                type="range"
                min="25"
                max="50"
                step="1"
                value={riskThreshold}
                onChange={e => setRiskThreshold(parseInt(e.target.value, 10))}
              />
              <div className="threshold-val num" style={{ minWidth: 64, color: 'var(--warn)' }}>
                {riskThreshold}
                <span className="unit">%↑</span>
              </div>
            </div>
          </OptGroup>

          <OptGroup label="포함 섹션">
            <Check
              label="요약 (평균 원가율·위험 메뉴 수)"
              value={opts.summary}
              onChange={v => updOpt('summary', v)}
            />
            <Check
              label="카테고리별 종합 비교표"
              value={opts.catTable}
              onChange={v => updOpt('catTable', v)}
            />
            <Check
              label="카테고리별 메뉴 전체"
              value={opts.perCategory}
              onChange={v => updOpt('perCategory', v)}
            />
            <Check
              label="위험 메뉴 부록 (원가율 높은 순)"
              value={opts.riskList}
              onChange={v => updOpt('riskList', v)}
            />
          </OptGroup>

          <OptGroup label="문서 형식">
            <Check label="PDF" value={docFormat.pdf} onChange={v => updFmt('pdf', v)} />
            <Check
              label="Excel (.xlsx)"
              value={docFormat.excel}
              onChange={v => updFmt('excel', v)}
            />
          </OptGroup>
        </>
      }
      preview={
        <>
          {/* ── 보고서 헤더 ── */}
          <div className="paper-head">
            <div className="paper-eyebrow">7번가피자 본사 · 원가관리</div>
            <h2 className="paper-title">{periodLabel} 원가계산 종합 보고서</h2>
            <div className="paper-meta">
              <span>
                대상: {activeCats.length}개 카테고리 · {totalCount}개 메뉴
              </span>
              <span>·</span>
              <span>위험 기준 {riskThreshold}%↑</span>
              <span>·</span>
              <span className="mono">
                단가 기준 {new Date().toLocaleDateString('ko-KR').slice(0, -1)} ·{' '}
                {getProfile().name}
              </span>
            </div>
          </div>

          {/* ── 요약 통계 ── */}
          {opts.summary && (
            <div className="paper-stat-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="paper-stat">
                <div className="paper-stat-label">대상 메뉴</div>
                <div className="paper-stat-val num">
                  {totalCount > 0 ? totalCount : '—'}
                  <span className="unit">{totalCount > 0 ? '개' : ''}</span>
                </div>
                <div className="paper-stat-foot">{activeCats.length}개 카테고리</div>
              </div>
              <div className="paper-stat">
                <div className="paper-stat-label">평균 원가율</div>
                <div className="paper-stat-val num">
                  {allAvg > 0 ? allAvg.toFixed(1) : '—'}
                  <span className="unit">{allAvg > 0 ? '%' : ''}</span>
                </div>
                <div className="paper-stat-foot">전 카테고리 가중평균</div>
              </div>
              <div className="paper-stat">
                <div className="paper-stat-label">위험 메뉴</div>
                <div className="paper-stat-val num" style={{ color: 'var(--warn)' }}>
                  {allRisk}
                </div>
                <div className="paper-stat-foot">{riskThreshold}% 초과</div>
              </div>
              <div className="paper-stat">
                <div className="paper-stat-label">최고 원가율</div>
                <div className="paper-stat-val num" style={{ color: 'var(--negative)' }}>
                  {allMaxRate > 0 ? allMaxRate.toFixed(1) : '—'}
                  <span className="unit">{allMaxRate > 0 ? '%' : ''}</span>
                </div>
                <div className="paper-stat-foot">단일 메뉴 기준</div>
              </div>
            </div>
          )}

          {/* ── 카테고리 종합 비교 ── */}
          {opts.catTable && (
            <div className="paper-section">
              <div className="paper-section-title">카테고리별 종합 비교</div>
              {catStats.some(c => c.count > 0) ? (
                <>
                  <div className="cost-bars">
                    {catStats
                      .filter(c => c.count > 0)
                      .map(c => (
                        <div key={c.id} className="cost-bar-row">
                          <div className="cost-bar-label">
                            <span className="dot" style={{ background: c.color }} />
                            <span>{c.label}</span>
                          </div>
                          <div className="cost-bar-track">
                            <div
                              className="cost-bar-fill"
                              style={{
                                width: `${Math.min((c.avg / 50) * 100, 100)}%`,
                                background: c.color,
                              }}
                            />
                            <div
                              className="cost-bar-threshold"
                              style={{ left: `${(riskThreshold / 50) * 100}%` }}
                              title={`위험 기준 ${riskThreshold}%`}
                            />
                          </div>
                          <div className="cost-bar-val num">
                            {c.avg > 0 ? (
                              <>
                                <b>
                                  {c.avg.toFixed(1)}
                                  <span className="unit">%</span>
                                </b>
                                <span className="muted" style={{ fontSize: 11, marginLeft: 4 }}>
                                  ({c.min.toFixed(1)}~{c.max.toFixed(1)})
                                </span>
                              </>
                            ) : (
                              <span className="muted">원가 미등록</span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                  <table className="paper-table" style={{ marginTop: 14 }}>
                    <thead>
                      <tr>
                        <th>카테고리</th>
                        <th style={{ width: 70, textAlign: 'right' }}>메뉴 수</th>
                        <th style={{ width: 90, textAlign: 'right' }}>평균 원가율</th>
                        <th style={{ width: 120, textAlign: 'right' }}>최저 ~ 최고</th>
                        <th style={{ width: 80, textAlign: 'right' }}>위험</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catStats.map(c => (
                        <tr key={c.id}>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span
                                className="dot"
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: c.color,
                                }}
                              />
                              <b>{c.label}</b>
                            </span>
                          </td>
                          <td className="num right">{c.count}</td>
                          <td className="num right" style={{ fontWeight: 800 }}>
                            {c.avg > 0 ? `${c.avg.toFixed(1)}%` : '—'}
                          </td>
                          <td className="num right">
                            {c.avg > 0 ? `${c.min.toFixed(1)}% ~ ${c.max.toFixed(1)}%` : '—'}
                          </td>
                          <td className="num right">
                            {c.risk > 0 ? (
                              <span style={{ color: 'var(--warn)', fontWeight: 800 }}>
                                {c.risk}개 ⚠
                              </span>
                            ) : (
                              <span className="muted">0개</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <td style={{ fontWeight: 800 }}>합계</td>
                        <td className="num right" style={{ fontWeight: 800 }}>
                          {totalCount}
                        </td>
                        <td className="num right" style={{ fontWeight: 800 }}>
                          {allAvg > 0 ? `${allAvg.toFixed(1)}%` : '—'}
                        </td>
                        <td className="num right muted">—</td>
                        <td className="num right" style={{ fontWeight: 800, color: 'var(--warn)' }}>
                          {allRisk}개
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              ) : (
                <div
                  style={{
                    height: 60,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--text-4)',
                    fontSize: 13,
                  }}
                >
                  원가계산 → 판매가 등록 후 표시돼요
                </div>
              )}
            </div>
          )}

          {/* ── 카테고리별 메뉴 전체 (판매가/원가/원가율) ── */}
          {opts.perCategory &&
            catStats
              .filter(c => c.count > 0)
              .map(c => (
                <div className="paper-section paper-cat-section" key={c.id}>
                  <div
                    className="paper-section-title"
                    style={{
                      borderBottomColor: c.color,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span
                        className="dot"
                        style={{ width: 10, height: 10, borderRadius: 3, background: c.color }}
                      />
                      {c.label} 종합 원가 (전체 {c.count}개)
                    </span>
                    <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>
                      평균{' '}
                      <b className="num" style={{ color: c.avg > 0 ? 'var(--text-1)' : undefined }}>
                        {c.avg > 0 ? `${c.avg.toFixed(1)}%` : '—'}
                      </b>
                      {' · '}위험 {c.risk}개
                    </span>
                  </div>
                  <table className="paper-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>#</th>
                        <th>메뉴명</th>
                        <th style={{ width: 90, textAlign: 'right' }}>판매가</th>
                        <th style={{ width: 90, textAlign: 'right' }}>원가</th>
                        <th style={{ width: 80, textAlign: 'right' }}>원가율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.menus.map((m, i) => {
                        const risk = m.rate >= riskThreshold;
                        return (
                          <tr key={m.code || m.name}>
                            <td className="num">{i + 1}</td>
                            <td>{m.name}</td>
                            <td className="num right muted">
                              {m.sale > 0 ? `${formatNumber(m.sale)}원` : '—'}
                            </td>
                            <td className="num right muted">
                              {m.cost > 0 ? `${formatNumber(m.cost)}원` : '—'}
                            </td>
                            <td
                              className="num right"
                              style={{
                                fontWeight: risk ? 800 : 600,
                                color: risk ? 'var(--warn)' : 'var(--text-1)',
                              }}
                            >
                              {m.rate > 0 ? `${m.rate.toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}

          {/* ── 위험 메뉴 부록 ── */}
          {opts.riskList && riskMenus.length > 0 && (
            <div className="paper-section">
              <div className="paper-section-title" style={{ borderBottomColor: 'var(--warn)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Icon.alert style={{ width: 14, height: 14, color: 'var(--warn)' }} />
                  위험 메뉴 부록 (원가율 {riskThreshold}% 초과)
                </span>
              </div>
              <table className="paper-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>메뉴명</th>
                    <th style={{ width: 90 }}>카테고리</th>
                    <th style={{ width: 90, textAlign: 'right' }}>판매가</th>
                    <th style={{ width: 90, textAlign: 'right' }}>원가율</th>
                  </tr>
                </thead>
                <tbody>
                  {riskMenus.map((m, i) => (
                    <tr key={m.code || m.name}>
                      <td className="num">{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{m.name}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span
                            className="dot"
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: m.catColor,
                            }}
                          />
                          {m.catLabel}
                        </span>
                      </td>
                      <td className="num right muted">
                        {m.sale > 0 ? `${formatNumber(m.sale)}원` : '—'}
                      </td>
                      <td className="num right" style={{ fontWeight: 800, color: 'var(--warn)' }}>
                        {m.rate.toFixed(1)}% ⚠
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="paper-foot">
            <span>원가계산 보고서</span>
            <span className="mono">7번가 R&amp;D 플랫폼</span>
          </div>
        </>
      }
    />
  );
}
