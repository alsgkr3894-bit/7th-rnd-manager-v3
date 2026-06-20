import { useState, useEffect } from 'react';
import { initDB } from '@/lib/db/init';
import { getShipmentFiles, getShipmentRowsByFileId } from '@/lib/shipment/store-files';
import { aggregateShipmentRows } from '@/lib/shipment/aggregate';
import { getManagedProducts, seedManagedProductsIfEmpty } from '@/lib/shipment/store-managed';
import {
  buildShipmentMonthMap,
  buildShipmentTrendSeries,
} from '@/lib/report/build-shipment-report';
import { asObjectArray } from '@/lib/ui/prop-guards';
import { safeMonth, safeYear } from '@/lib/report/period';

export function useShipmentReportData(shipYear, shipMonth, setShipYear, setShipMonth) {
  const [aggRows, setAggRows] = useState([]);
  const [regProducts, setRegProducts] = useState([]);
  const [series, setSeries] = useState([]);
  const [seriesLabels, setSeriesLabels] = useState([]);
  const [fileLabel, setFileLabel] = useState('—');
  const [availPeriods, setAvailPeriods] = useState([]);
  const [dataError, setDataError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    // StrictMode 이중 마운트·빠른 월 변경 시 무거운 로드가 겹쳐 DB 조회가 느려지지 않도록
    // 가드. 폐기된 실행은 setState·후속 작업을 건너뛴다.
    let ignore = false;
    setIsLoading(true);
    initDB()
      .then(async () => {
        try {
          await seedManagedProductsIfEmpty();

          const files = asObjectArray(await getShipmentFiles());
          if (ignore) return;
          if (files.length === 0) {
            setDataError('출고 데이터가 없어요. 출고관리 → 파일 업로드를 먼저 해 주세요.');
            setIsLoading(false);
            return;
          }

          // 파일을 월 단위로 그룹핑 (같은 월의 파일은 합산 대상)
          const monthList = buildShipmentMonthMap(files);
          // year/month 없는 파일만 있으면 monthList가 빈 배열 → 빠른 종료
          if (monthList.length === 0) {
            setDataError('업로드된 파일에 날짜 정보가 없어요. 올바른 출고 파일을 업로드해 주세요.');
            setIsLoading(false);
            return;
          }
          setAvailPeriods(monthList.map(m => ({ year: m.year, month: m.month })));

          // 선택 월이 없으면 최신 월로 자동 맞춤 (early return 없이 그대로 로드)
          const selectedYear = safeYear(shipYear);
          const selectedMonth = safeMonth(shipMonth);
          const targetMonth =
            monthList.find(m => m.year === selectedYear && m.month === selectedMonth) ||
            monthList[0];
          if (targetMonth.year !== selectedYear || targetMonth.month !== selectedMonth) {
            setShipYear(targetMonth.year);
            setShipMonth(targetMonth.month);
            // state만 보정하고 계속 진행 — targetMonth 기준으로 로드
          }

          setFileLabel(`${targetMonth.year}년 ${targetMonth.month}월`);

          const managedProducts = asObjectArray(await getManagedProducts());
          if (ignore) return;
          setRegProducts(managedProducts);

          // 선택 월의 모든 파일 행 합산
          const targetRows = asObjectArray(
            (await Promise.all(targetMonth.files.map(f => getShipmentRowsByFileId(f.id)))).flat()
          );
          if (ignore) return;
          setAggRows(aggregateShipmentRows(targetRows, managedProducts));

          // 추이 차트: 최대 7개월, 각 월 전체 파일 합산
          const recentMonths = monthList.slice(0, 7).reverse(); // 오래된 달부터
          const labels = recentMonths.map(m => `${m.year}.${String(m.month).padStart(2, '0')}`);
          const monthlyRows = await Promise.all(
            recentMonths.map(async m => {
              const chunks = await Promise.all(m.files.map(f => getShipmentRowsByFileId(f.id)));
              return asObjectArray(chunks.flat());
            })
          );
          if (ignore) return;
          const { exclusiveData, genericData } = buildShipmentTrendSeries(
            monthlyRows,
            managedProducts
          );
          if (exclusiveData.some(v => v > 0) || genericData.some(v => v > 0)) {
            setSeries([
              { name: '전용상품', data: exclusiveData },
              { name: '범용상품', data: genericData },
            ]);
            setSeriesLabels(labels);
          } else {
            setSeries([]);
            setSeriesLabels(labels);
          }
          setDataError(null);
        } catch (err) {
          if (ignore) return;
          console.error('[shipment report]', err);
          setDataError('출고량 데이터를 불러오는 중 오류가 발생했어요.');
        } finally {
          if (!ignore) setIsLoading(false);
        }
      })
      .catch(() => {
        if (ignore) return;
        setIsLoading(false);
        setDataError('데이터베이스에 연결할 수 없어요. 출고 파일을 먼저 업로드해 주세요.');
      });
    return () => {
      ignore = true;
    };
  }, [shipYear, shipMonth, setShipYear, setShipMonth, reloadCount]);

  return {
    aggRows,
    regProducts,
    series,
    seriesLabels,
    fileLabel,
    availPeriods,
    dataError,
    isLoading,
    reload: () => setReloadCount(c => c + 1),
  };
}
