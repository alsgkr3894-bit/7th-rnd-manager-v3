import { renderHomeDashboardRow } from '@/components/home/home-dashboard-rows/homeDashboardRowRenderer';

export function HomeDashboardRows({ rowsToRender = [], ...context }) {
  return rowsToRender.map(rowId => renderHomeDashboardRow(rowId, context));
}
