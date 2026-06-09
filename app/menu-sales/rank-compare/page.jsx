'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import {
  buildPeriodCompare,
  buildCategoryDetails,
  buildGroupRanking,
  deriveCompareB,
  MOVER_CATEGORIES,
  buildOrderedCategories,
} from '@/lib/sales';
import { Icon } from '@/components/icons';
import { PeriodBar } from '@/components/sales/PeriodBar';
import { RankCompareEmpty } from '@/components/sales/RankCompareEmpty';

const _loadingFallback = <div className="skeleton" style={{ height: 240, borderRadius: 12 }} />;

const SingleMonthView = dynamic(
  () => import('@/components/sales/SingleMonthView').then(m => m.SingleMonthView),
  { ssr: false, loading: () => _loadingFallback }
);

const CompareView = dynamic(
  () => import('@/components/sales/CompareView').then(m => m.CompareView),
  { ssr: false, loading: () => _loadingFallback }
);
import { useRankCompareData } from '@/lib/sales/use-rank-compare-data';
import { useAvgCostRate } from '@/lib/sales/use-avg-cost-rate';
import { formatShareText } from '@/lib/sales/share-formatter';
import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

const VALID_MODES = new Set(['single', 'mom', 'yoy', 'custom']);

function normalizeMode(value) {
  const requested = asDisplayText(value, 'single');
  return VALID_MODES.has(requested) ? requested : 'single';
}

function normalizePeriod(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const year = asFiniteNumber(value.year, null);
  const month = asFiniteNumber(value.month, null);
  if (year == null || month == null || year < 1900 || year > 2999 || month < 1 || month > 12) {
    return null;
  }

  return { year: Math.floor(year), month: Math.floor(month) };
}

export default function Page() {
  const router = useRouter();
  const { ready, rows, available } = useRankCompareData();
  const avgCostRate = useAvgCostRate();

  const [mode, setMode] = useState('single'); // single | mom | yoy | custom
  const [periodA, setPeriodA] = useState(null);
  const [periodB, setPeriodB] = useState(null);
  const [category, setCategory] = useState(null);
  const [singleCategory, setSingleCategory] = useState(null);

  const safeRows = useMemo(() => asObjectArray(rows), [rows]);
  const safeAvailable = useMemo(
    () => asObjectArray(available).map(normalizePeriod).filter(Boolean),
    [available]
  );
  const safeMode = normalizeMode(mode);
  const safePeriodA = useMemo(() => normalizePeriod(periodA), [periodA]);
  const safePeriodB = useMemo(() => normalizePeriod(periodB), [periodB]);
  const selectedCategory = asDisplayText(category);
  const selectedSingleCategory = asDisplayText(singleCategory);

  // 데이터 로드 후 초기 기간 설정
  useEffect(() => {
    if (!safeAvailable.length || safePeriodA) return;
    const latest = safeAvailable[0];
    setPeriodA(latest);
    setPeriodB(deriveCompareB(latest, 'mom'));
  }, [safeAvailable, safePeriodA]);

  // 모드 변경 시 B 자동 계산 (custom/single 제외)
  useEffect(() => {
    if (!safePeriodA || safeMode === 'custom' || safeMode === 'single') return;
    setPeriodB(deriveCompareB(safePeriodA, safeMode));
  }, [safeMode, safePeriodA]);

  const singleDetail = useMemo(() => {
    if (safeMode !== 'single' || !safePeriodA) return null;
    return buildCategoryDetails(safeRows, safePeriodA, { topN: 3, groupBy: 'group' });
  }, [safeRows, safePeriodA, safeMode]);

  const singleMenus = useMemo(() => {
    if (safeMode !== 'single' || !safePeriodA) return [];
    return buildGroupRanking(safeRows, safePeriodA);
  }, [safeRows, safePeriodA, safeMode]);

  const singleCategories = useMemo(
    () =>
      buildOrderedCategories(
        new Set(singleMenus.map(m => asDisplayText(m.category)).filter(Boolean))
      ),
    [singleMenus]
  );

  const categories = useMemo(() => {
    const found = new Set();
    for (const r of safeRows) {
      const safeCategory = asDisplayText(r.category);
      if (r.status === 'classified' && safeCategory) found.add(safeCategory);
    }
    return buildOrderedCategories(found, ['전체']);
  }, [safeRows]);

  const compare = useMemo(() => {
    if (!safePeriodA || !safePeriodB) return null;
    return buildPeriodCompare(safeRows, safePeriodA, safePeriodB, {
      groupBy: 'group',
      category: selectedCategory && selectedCategory !== '전체' ? selectedCategory : null,
      topN: 3,
    });
  }, [safeRows, safePeriodA, safePeriodB, selectedCategory]);

  const movers = useMemo(() => {
    if (!safePeriodA || !safePeriodB) return { topRise: [], topFall: [] };
    const { topRise, topFall } = buildPeriodCompare(safeRows, safePeriodA, safePeriodB, {
      groupBy: 'group',
      category: MOVER_CATEGORIES,
      topN: 3,
    });
    return { topRise: asObjectArray(topRise), topFall: asObjectArray(topFall) };
  }, [safeRows, safePeriodA, safePeriodB]);

  function onCustomChange(side, period) {
    const safePeriod = normalizePeriod(period);
    if (!safePeriod) return;
    if (side === 'a') setPeriodA(safePeriod);
    else setPeriodB(safePeriod);
  }

  async function handleShare() {
    try {
      const text = formatShareText({
        mode: safeMode,
        periodA: safePeriodA,
        periodB: safePeriodB,
        singleMenus,
        singleCategory: selectedSingleCategory,
        compare,
      });
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
      await navigator.clipboard.writeText(text);
      showToast('순위 복사 완료', 'ok');
    } catch {
      showToast('복사 실패', 'warn');
    }
  }

  return (
    <main className="main">
      <PageHeader
        breadcrumb={['메뉴 판매량', '순위 및 비교']}
        title="판매량 비교"
        sub="두 기간의 판매량을 메뉴별로 비교하고, 신규·단종 메뉴를 확인할 수 있어요."
        actions={
          safeAvailable.length > 0 && (
            <>
              <button className="btn ghost" onClick={handleShare}>
                <Icon.copy style={{ width: 14, height: 14 }} />
                공유
              </button>
              <button
                className="btn primary"
                onClick={() => router.push('/report/menu-sales-compare')}
              >
                <Icon.doc style={{ width: 14, height: 14 }} />
                보고서 생성
              </button>
            </>
          )
        }
      />

      {!ready ? (
        <div className="skeleton" style={{ height: 240, borderRadius: 12, marginTop: 16 }} />
      ) : safeAvailable.length === 0 ? (
        <RankCompareEmpty />
      ) : (
        <>
          {safePeriodA && safePeriodB && (
            <PeriodBar
              mode={safeMode}
              onModeChange={setMode}
              periodA={safePeriodA}
              periodB={safePeriodB}
              availablePeriods={safeAvailable}
              onCustomChange={onCustomChange}
            />
          )}

          {safeMode === 'single' ? (
            <SingleMonthView
              period={safePeriodA}
              detail={singleDetail}
              menus={singleMenus}
              categories={singleCategories}
              category={selectedSingleCategory}
              onCategoryChange={setSingleCategory}
              avgCostRate={avgCostRate}
            />
          ) : (
            <CompareView
              categories={categories}
              category={selectedCategory}
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
