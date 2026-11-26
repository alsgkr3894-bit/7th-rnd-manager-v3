import { useState, useEffect } from 'react';

/**
 * 사이드바/탑바 배지에 필요한 카운트를 pathname 변경 시마다 로드.
 *
 * 개선 (응집도·예측가능성):
 *   - 두 개의 독립 useEffect + 각자 initDB → 하나의 이펙트에서 initDB 1회 후 병렬 로드
 *   - silent catch → 에러 로깅(배지가 0일 때 "데이터 없음" vs "실패" 구분 가능)
 *   - unmount 후 상태 업데이트 방지(alive guard)
 *
 * 식자재 이슈 집계에 실패하면 0으로 바꾸지 않고 마지막 성공 건수를 둔 채 ingredientIssueFailed를 켠다.
 * (한 번도 못 읽었으면 건수는 null)
 *
 * @returns {{ unmatchedCount: number, menuMasterIssueCount: number,
 *   ingredientIssueCount: number|null, ingredientIssueFailed: boolean }}
 */
export function usePageStats(pathname) {
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [menuMasterIssueCount, setMenuMasterIssueCount] = useState(0);
  const [ingredientIssueCount, setIngredientIssueCount] = useState(null);
  const [ingredientIssueFailed, setIngredientIssueFailed] = useState(false);
  const [tick, setTick] = useState(0);

  // 탭이 다시 보일 때(다른 탭에서 업로드·노트 변경 후 돌아올 때) 카운트 갱신
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) setTick(t => t + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      let dbReady = false;
      try {
        const { initDB } = await import('@/lib/db');
        await initDB();
        dbReady = true;
        // 식자재 이슈는 다른 배지의 조회 실패와 따로 반영한다
        import('@/lib/ingredient/issue-count')
          .then(module => module.getIngredientIssueCount())
          .then(count => {
            if (!alive) return;
            setIngredientIssueCount(count);
            setIngredientIssueFailed(false);
          })
          .catch(e => {
            console.warn('[usePageStats] 식자재 이슈 로드 실패', e);
            if (alive) setIngredientIssueFailed(true);
          });
        const [salesModule, menuMasterModule, recipeSummaryModule, recipeIssuesModule] =
          await Promise.all([
            import('@/lib/sales'),
            import('@/lib/menu-master'),
            import('@/lib/menu-master/recipe-summary'),
            import('@/lib/menu-master/recipe-issues'),
          ]);
        const [issues, menus] = await Promise.all([
          salesModule.getIssues({ status: 'open' }),
          menuMasterModule.getAllMenuMaster(),
        ]);
        const menuRows = Array.isArray(menus) ? menus : [];
        if (!alive) return;
        const issueList = Array.isArray(issues) ? issues : [];
        setUnmatchedCount(issueList.length);
        try {
          const recipeSummaryMap = await recipeSummaryModule.loadMenuRecipeSummaryMap(menuRows);
          if (alive) {
            setMenuMasterIssueCount(
              recipeIssuesModule.buildRecipeIssues(menuRows, recipeSummaryMap).length
            );
          }
        } catch (e) {
          if (alive) console.warn('[usePageStats] 메뉴마스터 이슈 로드 실패', e);
        }
      } catch (e) {
        if (!alive) return;
        console.warn('[usePageStats] 배지 로드 실패', e);
        // DB를 열지 못하면 식자재 이슈도 확인하지 못한 것이다
        if (!dbReady) setIngredientIssueFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pathname, tick]);

  return { unmatchedCount, menuMasterIssueCount, ingredientIssueCount, ingredientIssueFailed };
}
