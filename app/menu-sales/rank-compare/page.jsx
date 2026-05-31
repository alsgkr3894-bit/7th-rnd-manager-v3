'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import {
  buildPeriodCompare, buildCategoryDetails, buildGroupRanking, deriveCompareB,
  MOVER_CATEGORIES, buildOrderedCategories,
} from '@/lib/sales';
import { Icon } from '@/components/icons';
import { PeriodBar } from '@/components/sales/PeriodBar';
import { RankCompareEmpty } from '@/components/sales/RankCompareEmpty';

const _loadingFallback = <div className="skeleton" style={{ height: 240, borderRadius: 12 }} />;

const SingleMonthView = dynamic(
  () => import('@/components/sales/SingleMonthView').then(m => m.SingleMonthView),
  { ssr: false, loading: () => _loadingFallback },
);

const CompareView = dynamic(
  () => import('@/components/sales/CompareView').then(m => m.CompareView),
  { ssr: false, loading: () => _loadingFallback },
);
import { useRankCompareData } from '@/lib/sales/use-rank-compare-data';
import { useAvgCostRate } from '@/lib/sales/use-avg-cost-rate';
import { formatShareText } from '@/lib/sales/share-formatter';

export default function Page() {
  const router = useRouter();
  const { ready, rows, available } = useRankCompareData();
  const avgCostRate = useAvgCostRate();

  const [mode, setMode] = useState('single'); // single | mom | yoy | custom
  const [periodA, setPeriodA] = useState(null);
  const [periodB, setPeriodB] = useState(null);
  const [category, setCategory] = useState(null);
  const [singleCategory, setSingleCategory] = useState(null);

  // 데이터 로드 후 초기 기간 설정
  useEffect(() => {
    if (!available.length || periodA) return;
    const latest = available[0];
    setPeriodA(latest);
    setPeriodB(deriveCompareB(latest, 'mom'));
  }, [available, periodA]);

  // 모드 변경 시 B 자동 계산 (custom/single 제외)
  useEffect(() => {
    if (!periodA || mode === 'custom' || mode === 'single') return;
    setPeriodB(deriveCompareB(periodA, mode));
  }, [mode, periodA]);

  const singleDetail = useMemo(() => {
    if (mode !== 'single' || !periodA) return null;
    return buildCategoryDetails(rows, periodA, { topN: 3, groupBy: 'group' });
  }, [rows, periodA, mode]);

  const singleMenus = useMemo(() => {
    if (mode !== 'single' || !periodA) return [];
    return buildGroupRanking(rows, periodA);
  }, [rows, periodA, mode]);

  const singleCategories = useMemo(
    () => buildOrderedCategories(new Set(singleMenus.map(m => m.category))),
    [singleMenus],
  );

  const categories = useMemo(() => {
    const found = new Set();
    for (const r of rows) {
      if (r.status === 'classified' && r.category) found.add(r.category);
    }
    return buildOrderedCategories(found, ['전체']);
  }, [rows]);

  const compare = useMemo(() => {
    if (!periodA || !periodB) return null;
    return buildPeriodCompare(rows, periodA, periodB, {
      groupBy: 'group',
      category: category && category !== '전체' ? category : null,
      topN: 3,
    });
  }, [rows, periodA, periodB, category]);

  const movers = useMemo(() => {
    if (!periodA || !periodB) return { topRise: [], topFall: [] };
    const { topRise, topFall } = buildPeriodCompare(rows, periodA, periodB, {
      groupBy: 'group',
      category: MOVER_CATEGORIES,
      topN: 3,
    });
    return { topRise, topFall };
  }, [rows, periodA, periodB]);

  function onCustomChange(side, period) {
    if (side === 'a') setPeriodA(period);
    else setPeriodB(period);
  }

  async function handleShare() {
    const text = formatShareText({ mode, periodA, periodB, singleMenus, singleCategory, compare });
    try {
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
          available.length > 0 && (
            <>
              <button className="btn ghost" onClick={handleShare}>
                <Icon.copy style={{width:14, height:14}}/>
                공유
              </button>
              <button className="btn primary" onClick={() => router.push('/report/menu-sales-compare')}>
                <Icon.doc style={{width:14, height:14}}/>
                보고서 생성
              </button>
            </>
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
