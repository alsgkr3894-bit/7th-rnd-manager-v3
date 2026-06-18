'use client';
import { useState, useEffect } from 'react';
import { initDB } from '@/lib/db/init';
import { getAll } from '@/lib/db';
import { getUserExcluded, getUserRules } from '@/lib/sales';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { safeMonth, safeYear } from '@/lib/report/period';

/**
 * 판매 원시 데이터 로드 훅.
 * 반환값: salesRows, excludedList, availYears, availMonthsByYear, defaultPeriod, dataError, isLoading
 * defaultPeriod — 데이터가 로드되면 { year, month, cmpYear, cmpMonth } 를 한 번 제공.
 */
export function useSalesReportData() {
  const [salesRows, setSalesRows] = useState([]);
  const [excludedList, setExcludedList] = useState([]);
  const [availYears, setAvailYears] = useState([]);
  const [availMonthsByYear, setAvailMonthsByYear] = useState({});
  const [defaultPeriod, setDefaultPeriod] = useState(null);
  const [dataError, setDataError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    initDB()
      .then(async () => {
        try {
          const [rows, excluded, rules] = await Promise.all([
            getAll('sales_rows'),
            getUserExcluded(),
            getUserRules(),
          ]);
          if (ignore) return;

          const safeRows = asObjectArray(rows);
          const safeExcluded = asObjectArray(excluded);
          const safeRules = asObjectArray(rules);

          // ref_excluded + sales_rules 중 category='품목제외' 합산 후 중복 제거
          const excludedNames = new Set();
          safeExcluded.forEach(e => {
            const name = asDisplayText(e.menuName);
            if (name) excludedNames.add(name);
          });
          safeRules
            .filter(r => asDisplayText(r.category) === '품목제외' && r.enable !== false)
            .forEach(r => {
              const name = asDisplayText(r.rawMenuName);
              if (name) excludedNames.add(name);
            });

          const byYear = {};
          for (const r of safeRows) {
            const y = safeYear(r.year, 0);
            const m = safeMonth(r.month, 0);
            if (!y || !m) continue;
            if (!byYear[y]) byYear[y] = new Set();
            byYear[y].add(m);
          }
          const years = Object.keys(byYear)
            .map(Number)
            .sort((a, b) => b - a);
          const byYearArr = {};
          for (const y of years) byYearArr[y] = [...byYear[y]].sort((a, b) => a - b);

          setSalesRows(safeRows);
          setExcludedList([...excludedNames].sort((a, b) => a.localeCompare(b, 'ko')));
          setAvailYears(years);
          setAvailMonthsByYear(byYearArr);

          if (years.length > 0) {
            const latestY = years[0];
            const latestM = byYearArr[latestY].at(-1);
            setDefaultPeriod({
              year: latestY,
              month: latestM,
              cmpYear: latestM === 1 ? latestY - 1 : latestY,
              cmpMonth: latestM === 1 ? 12 : latestM - 1,
            });
          }
          setIsLoading(false);
        } catch (err) {
          if (ignore) return;
          console.error('[sales report]', err);
          setDataError('판매 데이터를 불러오는 중 오류가 발생했어요.');
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (ignore) return;
        setDataError('데이터베이스에 연결할 수 없어요. 데이터를 먼저 업로드해 주세요.');
        setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return {
    salesRows,
    excludedList,
    availYears,
    availMonthsByYear,
    defaultPeriod,
    dataError,
    isLoading,
  };
}
