'use client';
import { useEffect, useState } from 'react';
import { initDB, getAll, hasStore } from '@/lib/db';
import { showToast } from '@/components/Toast';
import { asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

function safePeriodFromRow(row) {
  const year = asFiniteNumber(row?.year, null);
  const month = asFiniteNumber(row?.month, null);
  if (
    year == null ||
    month == null ||
    year < 1900 ||
    year > 2999 ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return { year: Math.floor(year), month: Math.floor(month) };
}

/**
 * 판매 순위·비교 페이지의 raw 데이터를 로드한다.
 * 기간 선택·모드 상태는 호출부(page)가 직접 관리한다.
 *
 * @returns {{ ready: boolean, rows: object[], available: {year,month}[] }}
 */
export function useRankCompareData() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState([]);
  const [available, setAvailable] = useState([]);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        await initDB();
        if (ignore) return;

        if (!hasStore('sales_rows')) {
          setRows([]);
          setAvailable([]);
          setReady(true);
          return;
        }

        const all = asObjectArray(await getAll('sales_rows'));
        if (ignore) return;

        setRows(all);

        const periodSet = new Map();
        for (const r of all) {
          const period = safePeriodFromRow(r);
          if (!period) continue;
          const key = `${period.year}-${period.month}`;
          if (!periodSet.has(key)) periodSet.set(key, period);
        }
        setAvailable(
          Array.from(periodSet.values()).sort((a, b) => b.year - a.year || b.month - a.month)
        );
        setReady(true);
      } catch (err) {
        if (ignore) return;
        console.error('[useRankCompareData] 로드 실패:', err);
        showToast('데이터 로드 실패', 'err');
        setReady(true); // 오류 시에도 ready=true로 전환 — 무한 로딩 방지
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  return { ready, rows, available };
}
