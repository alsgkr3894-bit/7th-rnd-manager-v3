'use client';
import { useEffect, useState } from 'react';
import { initDB, getAll, hasStore } from '@/lib/db';
import { showToast } from '@/components/Toast';

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
    (async () => {
      try {
        await initDB();
        if (!hasStore('sales_rows')) { setReady(true); return; }

        const all = await getAll('sales_rows');
        setRows(all);

        const periodSet = new Map();
        for (const r of all) {
          const key = `${r.year}-${r.month}`;
          if (!periodSet.has(key)) periodSet.set(key, { year: r.year, month: r.month });
        }
        setAvailable(
          Array.from(periodSet.values()).sort((a, b) => b.year - a.year || b.month - a.month)
        );
        setReady(true);
      } catch (err) {
        console.error('[useRankCompareData] 로드 실패:', err);
        showToast('데이터 로드 실패', 'err');
      }
    })();
  }, []);

  return { ready, rows, available };
}
