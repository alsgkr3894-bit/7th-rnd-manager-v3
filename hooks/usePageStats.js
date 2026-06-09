import { useState, useEffect } from 'react';

export function countReportingNotes(notes) {
  if (!Array.isArray(notes)) return 0;
  return notes.filter(n => n && typeof n === 'object' && n.status === '보고예정').length;
}

/**
 * 사이드바/탑바 배지에 필요한 카운트를 pathname 변경 시마다 로드.
 *
 * 개선 (응집도·예측가능성):
 *   - 두 개의 독립 useEffect + 각자 initDB → 하나의 이펙트에서 initDB 1회 후 병렬 로드
 *   - silent catch → 에러 로깅(배지가 0일 때 "데이터 없음" vs "실패" 구분 가능)
 *   - unmount 후 상태 업데이트 방지(alive guard)
 *
 * @returns {{ unmatchedCount: number, reportingCount: number }}
 */
export function usePageStats(pathname) {
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [reportingCount, setReportingCount] = useState(0);
  const [tick, setTick] = useState(0);

  // 탭이 다시 보일 때(다른 탭에서 업로드·노트 변경 후 돌아올 때) 카운트 갱신
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) setTick(t => t + 1); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { initDB } = await import('@/lib/db');
        await initDB();
        const [{ getIssues }, { getAllNotes }] = await Promise.all([
          import('@/lib/sales'),
          import('@/lib/note'),
        ]);
        const [issues, notes] = await Promise.all([
          getIssues({ status: 'open' }),
          getAllNotes(),
        ]);
        if (!alive) return;
        const issueList = Array.isArray(issues) ? issues : [];
        setUnmatchedCount(issueList.length);
        setReportingCount(countReportingNotes(notes));
      } catch (e) {
        if (alive) console.warn('[usePageStats] 배지 로드 실패', e);
      }
    })();
    return () => { alive = false; };
  }, [pathname, tick]);

  return { unmatchedCount, reportingCount };
}
