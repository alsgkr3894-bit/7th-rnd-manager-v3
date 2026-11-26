import { useState, useEffect, useRef } from 'react';
import { onStoresChanged } from '@/lib/db/revision';
import { isRefreshDue } from '@/hooks/useVisibilityRefresh';

/** 이 저장소가 바뀌면 배지를 다시 센다 */
export const BADGE_STORES = new Set([
  'menu_sales_issues',
  'menu_master',
  'menu_recipes',
  'cost_ingredients',
  'cost_recipe_groups',
  'cost_edge_dough',
  'cost_selling_prices',
  'price_files',
  'price_rows',
  'ref_shipment_products',
]);
// 대량 저장이 끝날 때까지 모았다가 한 번만 센다
const CHANGE_DEBOUNCE_MS = 600;

/**
 * 사이드바/탑바 배지에 필요한 카운트. 처음 한 번 세고, 그 뒤에는 관련 저장소가 바뀌었을 때와
 * 탭으로 돌아왔을 때만 다시 센다. 화면을 옮기기만 해서는 읽지 않는다(실패한 적이 있으면 다시 시도).
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
  const failedRef = useRef(false);

  // 탭이 다시 보일 때(다른 탭에서 업로드·노트 변경 후 돌아올 때) 카운트 갱신
  useEffect(() => {
    let lastAt = null;
    const onVisible = () => {
      const now = Date.now();
      if (document.hidden || !isRefreshDue(lastAt, now)) return;
      lastAt = now;
      setTick(t => t + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    let timer = null;
    const unsubscribe = onStoresChanged(({ stores }) => {
      if (!stores.some(store => BADGE_STORES.has(store))) return;
      clearTimeout(timer);
      timer = setTimeout(() => setTick(t => t + 1), CHANGE_DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  // 지난번에 못 읽은 배지는 화면을 옮길 때 다시 시도한다
  useEffect(() => {
    if (failedRef.current) setTick(t => t + 1);
  }, [pathname]);

  useEffect(() => {
    let alive = true;
    failedRef.current = false;
    const markFailed = () => {
      failedRef.current = true;
    };
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
            if (!alive) return;
            markFailed();
            setIngredientIssueFailed(true);
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
          if (!alive) return;
          markFailed();
          console.warn('[usePageStats] 메뉴마스터 이슈 로드 실패', e);
        }
      } catch (e) {
        if (!alive) return;
        markFailed();
        console.warn('[usePageStats] 배지 로드 실패', e);
        // DB를 열지 못하면 식자재 이슈도 확인하지 못한 것이다
        if (!dbReady) setIngredientIssueFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tick]);

  return { unmatchedCount, menuMasterIssueCount, ingredientIssueCount, ingredientIssueFailed };
}
