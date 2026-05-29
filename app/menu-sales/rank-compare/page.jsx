'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB, getAll, hasStore } from '@/lib/db';
import {
  buildPeriodCompare, buildCategoryDetails, buildGroupRanking, deriveCompareB,
  CATEGORY_ORDER,
} from '@/lib/sales';
import { Icon } from '@/components/icons';
import { PeriodBar } from '@/components/sales/PeriodBar';
import { SingleMonthView } from '@/components/sales/SingleMonthView';
import { CompareView } from '@/components/sales/CompareView';
import { RankCompareEmpty } from '@/components/sales/RankCompareEmpty';
import { getPizzaRecipeMap, pizzaBaseCost } from '@/lib/cost/pizza-detail';
import { getAllMenuPrices } from '@/lib/cost/menu-price';

const MOVER_CATEGORIES = ['피자', '사이드', '1인피자'];

export default function Page() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState([]);
  const [available, setAvailable] = useState([]);
  const [mode, setMode] = useState('single'); // single | mom | yoy | custom
  const [periodA, setPeriodA] = useState(null);
  const [periodB, setPeriodB] = useState(null);
  const [category, setCategory] = useState(null); // null = 전체
  const [singleCategory, setSingleCategory] = useState(null); // 월 상세 보기 카테고리 필터
  const [avgCostRate, setAvgCostRate] = useState(null); // 피자 평균 원가율

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        if (!hasStore('sales_rows')) { setReady(true); return; }
        const all = await getAll('sales_rows');
        setRows(all);

        // 업로드된 모든 월 추출 (최신순)
        const periodSet = new Map();
        for (const r of all) {
          const key = `${r.year}-${r.month}`;
          if (!periodSet.has(key)) periodSet.set(key, { year: r.year, month: r.month });
        }
        const periods = Array.from(periodSet.values())
          .sort((a, b) => b.year - a.year || b.month - a.month);
        setAvailable(periods);

        // 기본 기준 A = 최신 업로드 월
        const latest = periods[0];
        if (latest) {
          setPeriodA(latest);
          setPeriodB(deriveCompareB(latest, 'mom'));
        }
        setReady(true);
      } catch (err) {
        console.error('[rank-compare] 로드 실패:', err);
        showToast('데이터 로드 실패', 'err');
      }
    })();
  }, []);

  // 모드 변경 시 B 자동 계산 (custom/single 제외)
  useEffect(() => {
    if (!periodA || mode === 'custom' || mode === 'single') return;
    setPeriodB(deriveCompareB(periodA, mode));
  }, [mode, periodA]);

  // 피자 평균 원가율 계산 — cost_pizza_detail 레시피 + cost_selling_prices 판매가
  useEffect(() => {
    (async () => {
      try {
        const [pizzaMap, menuPrices] = await Promise.all([
          getPizzaRecipeMap(),
          getAllMenuPrices(),
        ]);
        const pizzaPrices = menuPrices.filter(p =>
          (p.category === '피자' || p.category?.startsWith('피자/')) &&
          p.price > 0 && p.menuCode
        );
        const rates = [];
        for (const p of pizzaPrices) {
          const recipe = pizzaMap.get(p.menuCode);
          if (!recipe) continue;
          const cost = pizzaBaseCost(recipe);
          if (cost > 0) rates.push((cost / p.price) * 100);
        }
        if (rates.length > 0) {
          setAvgCostRate(rates.reduce((a, b) => a + b, 0) / rates.length);
        }
      } catch (err) {
        console.error('[rank-compare] 원가율 로드 실패:', err);
      }
    })();
  }, []);

  // single 모드: 선택 월 = periodA. 카테고리별 상세 + 중분류 순위
  const singleDetail = useMemo(() => {
    if (mode !== 'single' || !periodA) return null;
    return buildCategoryDetails(rows, periodA, { topN: 3, groupBy: 'group' });
  }, [rows, periodA, mode]);

  // 중분류 단위 순위 (사이즈별 detail 포함)
  const singleMenus = useMemo(() => {
    if (mode !== 'single' || !periodA) return [];
    return buildGroupRanking(rows, periodA);
  }, [rows, periodA, mode]);

  const singleCategories = useMemo(() => {
    const found = new Set(singleMenus.map(m => m.category));
    const ordered = CATEGORY_ORDER.filter(c => found.has(c));
    const extras = Array.from(found).filter(c => !CATEGORY_ORDER.includes(c));
    return [...ordered, ...extras];
  }, [singleMenus]);

  // 비교 탭 카테고리 후보 — CATEGORY_ORDER 기준 정렬
  const categories = useMemo(() => {
    const found = new Set();
    for (const r of rows) {
      if (r.status === 'classified' && r.category) found.add(r.category);
    }
    const ordered = CATEGORY_ORDER.filter(c => found.has(c));
    const extras = Array.from(found).filter(c => !CATEGORY_ORDER.includes(c));
    return ['전체', ...ordered, ...extras];
  }, [rows]);

  // 비교 계산 (페이지 전체 표시용) — 중분류 기준
  const compare = useMemo(() => {
    if (!periodA || !periodB) return null;
    return buildPeriodCompare(rows, periodA, periodB, {
      groupBy: 'group',
      category: category && category !== '전체' ? category : null,
      topN: 3,
    });
  }, [rows, periodA, periodB, category]);

  // 상승/하락 메뉴 — 피자/사이드/1인피자만, 양쪽 모두 판매 있는 메뉴 (신규/단종 제외)
  const movers = useMemo(() => {
    if (!periodA || !periodB) return { topRise: [], topFall: [] };
    const restricted = buildPeriodCompare(rows, periodA, periodB, {
      groupBy: 'group',
      category: MOVER_CATEGORIES,
      topN: 3,
    });
    return { topRise: restricted.topRise, topFall: restricted.topFall };
  }, [rows, periodA, periodB]);


  function onCustomChange(side, period) {
    if (side === 'a') setPeriodA(period);
    else setPeriodB(period);
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴 판매량', '순위 및 비교']}
        title="판매량 비교"
        sub="두 기간의 판매량을 메뉴별로 비교하고, 신규·단종 메뉴를 확인할 수 있어요."
        actions={
          available.length > 0 && (
            <button className="btn primary" onClick={() => router.push('/report/menu-sales-compare')}>
              <Icon.doc style={{width:14, height:14}}/>
              보고서 생성
            </button>
          )
        }
      />

      {ready && available.length === 0 ? (
        <RankCompareEmpty />
      ) : (
        <>
          {periodA && periodB && (
            <PeriodBar
              mode={mode}
              onModeChange={setMode}
              periodA={periodA}
              periodB={periodB}
              availablePeriods={available}
              onCustomChange={onCustomChange}
            />
          )}

          {mode === 'single' ? (
            <SingleMonthView
              period={periodA}
              detail={singleDetail}
              menus={singleMenus}
              categories={singleCategories}
              category={singleCategory}
              onCategoryChange={setSingleCategory}
              avgCostRate={avgCostRate}
            />
          ) : (
            <CompareView
              categories={categories}
              category={category}
              onCategoryChange={setCategory}
              compare={compare}
              movers={movers}
            />
          )}
        </>
      )}
    </main>
  );
}
