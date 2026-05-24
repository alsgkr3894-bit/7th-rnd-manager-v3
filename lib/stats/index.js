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
} from './sales-stats';

export { getNoteKpi, getCostRateKpi } from './note-stats';

export { getRecentActivities } from './activity-stats';
