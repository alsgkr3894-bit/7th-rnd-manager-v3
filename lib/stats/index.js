/**
 * lib/stats — 통계 계산 통합 진입점.
 *
 * 홈 페이지에서 사용:
 *   import { getSalesKpi, getNoteKpi, getCostRateKpi,
 *            getSalesTrend, getCategoryShare, getTopMenus,
 *            getRecentActivities } from '@/lib/stats';
 */

export {
  getSalesKpi,
  getSalesTrend,
  getCategoryShare,
  getTopMenus,
  getTopMenusWithTrend,
} from './sales-stats';

export { getNoteKpi, getCostRateKpi, getPipelineStats } from './note-stats';

export { getRecentActivities } from './activity-stats';
export { getCostAlertData } from './cost-stats';
export { getMonthlyBriefing } from './briefing-stats';
export { getTodayTodos } from './todo-stats';
export { getRecentPriceChanges } from './price-change-stats';
export { getWeekSchedule } from './schedule-stats';
