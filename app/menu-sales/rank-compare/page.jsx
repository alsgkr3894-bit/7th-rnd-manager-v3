'use client';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { initDB, getAll, hasStore } from '@/lib/db';
import {
  buildPeriodCompare, buildCategoryDetails, buildGroupRanking, deriveCompareB,
  exportSingleMonthXlsx, exportCompareXlsx,
  CATEGORY_ORDER,
} from '@/lib/sales';
import { Icon } from '@/components/icons';
import { PeriodBar } from '@/components/sales/PeriodBar';
import { SingleMonthView } from '@/components/sales/SingleMonthView';
import { CompareView } from '@/components/sales/CompareView';
import { RankCompareEmpty } from '@/components/sales/RankCompareEmpty';

const MOVER_CATEGORIES = ['피자', '사이드', '1인피자'];

export default function Page() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState([]);
  const [available, setAvailable] = useState([]);
  const [mode, setMode] = useState('single'); // single | mom | yoy | custom
  const [periodA, setPeriodA] = useState(null);
  const [periodB, setPeriodB] = useState(null);
  const [category, setCategory] = useState(null); // null = 전체
  const [singleCategory, setSingleCategory] = useState(null); // 월 상세 보기 카테고리 필터

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

  async function handleExport() {
    try {
      if (mode === 'single') {
        if (!periodA || !singleDetail || singleMenus.length === 0) {
          showToast('내보낼 데이터가 없습니다', 'err');
          return;
        }
        await exportSingleMonthXlsx(periodA, singleDetail, singleMenus);
      } else {
        if (!compare || compare.totalA + compare.totalB === 0) {
          showToast('내보낼 데이터가 없습니다', 'err');
          return;
        }
        await exportCompareXlsx(periodA, periodB, compare);
      }
      showToast('엑셀 파일이 저장됐어요', 'ok');
    } catch (err) {
      console.error('[rank-compare] export 실패:', err);
      showToast('엑셀 내보내기 실패', 'err');
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
            <button className="btn" onClick={handleExport}>
              <Icon.download style={{width:14, height:14}}/>
              엑셀 내보내기
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
