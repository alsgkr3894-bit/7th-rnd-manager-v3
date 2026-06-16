import {
  CostAlertWidget,
  QuickReportWidget,
  RankCard,
  ReportingNotesWidget,
  SampleStatsWidget,
} from '@/components/home/HomeWidgets';
import { NoteHeatmapWidget } from '@/components/home/NoteHeatmapWidget';
import { PipelineWidget } from '@/components/home/PipelineWidget';
import { PriceChangeWidget } from '@/components/home/PriceChangeWidget';
import { ScheduleWidget } from '@/components/home/ScheduleWidget';
import { TodoWidget } from '@/components/home/TodoWidget';
import { UnmatchedWidget } from '@/components/home/UnmatchedWidget';
import { pairDashboardRow } from './HomeDashboardRowShell';

export function renderTodoPairRow(context, rowId) {
  return pairDashboardRow(
    context.isVisible('todo') ? (
      <TodoWidget key="todo" todos={context.todos} router={context.router} />
    ) : null,
    context.showUnmatched ? (
      <UnmatchedWidget key="unmatched" issues={context.alertIssues} router={context.router} />
    ) : null,
    rowId
  );
}

export function renderPipelinePairRow(context, rowId) {
  return pairDashboardRow(
    context.showPipeline ? (
      <PipelineWidget key="pipeline" data={context.pipeline} router={context.router} />
    ) : null,
    context.isVisible('schedule') ? (
      <ScheduleWidget key="schedule" data={context.weekSchedule} router={context.router} />
    ) : null,
    rowId
  );
}

export function renderRanksRow(context) {
  return context.isVisible('ranks') ? (
    <div key="ranks" className="row-2b motion-stagger">
      <RankCard
        title="메뉴 판매 베스트 5"
        sub={context.rankSub}
        items={context.top}
        emptyTitle="순위 데이터 없음"
        accent="up"
        router={context.router}
      />
      <RankCard
        title="메뉴 판매 워스트 5"
        sub={context.rankSub}
        items={context.bottom}
        emptyTitle="워스트 데이터 없음"
        accent="down"
        router={context.router}
      />
    </div>
  ) : null;
}

export function renderPricePairRow(context, rowId) {
  return pairDashboardRow(
    context.isVisible('pricechange') ? (
      <PriceChangeWidget key="price" items={context.priceChanges} router={context.router} />
    ) : null,
    context.showCostAlert ? (
      <CostAlertWidget key="costalert" data={context.alertCostAlertData} router={context.router} />
    ) : null,
    rowId
  );
}

export function renderNotesPairRow(context, rowId) {
  return pairDashboardRow(
    context.showNotes ? (
      <ReportingNotesWidget key="notes" notes={context.reportingNotes} router={context.router} />
    ) : null,
    context.showSamples ? (
      <SampleStatsWidget key="samples" samples={context.recentSamples} router={context.router} />
    ) : null,
    rowId
  );
}

export function renderHeatPairRow(context, rowId) {
  return pairDashboardRow(
    context.isVisible('heatmap') ? (
      <NoteHeatmapWidget key="heatmap" notes={context.allNotes} />
    ) : null,
    context.isVisible('quickreport') ? (
      <QuickReportWidget key="quickreport" router={context.router} />
    ) : null,
    rowId
  );
}
