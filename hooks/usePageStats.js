import { useState, useEffect } from 'react';

/**
 * 사이드바/탑바 배지에 필요한 카운트를 pathname 변경 시마다 로드.
 * @returns {{ unmatchedCount: number, reportingCount: number }}
 */
export function usePageStats(pathname) {
  const [unmatchedCount,  setUnmatchedCount]  = useState(0);
  const [reportingCount,  setReportingCount]  = useState(0);

  useEffect(() => {
    import('@/lib/db').then(({ initDB }) => initDB())
      .then(() => import('@/lib/sales').then(({ getIssues }) => getIssues({ status: 'open' })))
      .then(issues => setUnmatchedCount(issues.length))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    import('@/lib/db').then(({ initDB }) => initDB())
      .then(() => import('@/lib/note').then(({ getAllNotes }) => getAllNotes()))
      .then(notes => setReportingCount(notes.filter(n => n.status === '보고예정').length))
      .catch(() => {});
  }, [pathname]);

  return { unmatchedCount, reportingCount };
}
