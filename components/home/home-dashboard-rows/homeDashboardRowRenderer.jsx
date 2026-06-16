import {
  renderActivitiesRow,
  renderBriefingRow,
  renderChartsRow,
  renderFreshnessRow,
  renderHealthRow,
  renderKpiRow,
  renderQuickNoteRow,
  renderRecentRow,
} from './HomeDashboardSingleRows';
import {
  renderHeatPairRow,
  renderNotesPairRow,
  renderPipelinePairRow,
  renderPricePairRow,
  renderRanksRow,
  renderTodoPairRow,
} from './HomeDashboardPairRows';

const ROW_RENDERERS = {
  recent: renderRecentRow,
  briefing: renderBriefingRow,
  kpi: renderKpiRow,
  freshness: renderFreshnessRow,
  health: renderHealthRow,
  'todo-pair': renderTodoPairRow,
  'pipeline-pair': renderPipelinePairRow,
  ranks: renderRanksRow,
  charts: renderChartsRow,
  'price-pair': renderPricePairRow,
  quicknote: renderQuickNoteRow,
  'notes-pair': renderNotesPairRow,
  'heat-pair': renderHeatPairRow,
  activities: renderActivitiesRow,
};

export function renderHomeDashboardRow(rowId, context) {
  const renderer = ROW_RENDERERS[rowId];
  return renderer ? renderer(context, rowId) : null;
}
