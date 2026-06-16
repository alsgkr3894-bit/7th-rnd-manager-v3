import { HomeActivities } from '@/components/home/HomeActivities';
import { HomeChartRow } from '@/components/home/HomeChartRow';
import { HomeKpiRow } from '@/components/home/HomeKpiRow';
import { HomeQuickNoteWidget } from '@/components/home/HomeQuickNoteWidget';
import { BriefingWidget } from '@/components/home/BriefingWidget';
import { DataFreshnessWidget } from '@/components/home/DataFreshnessWidget';
import { ModuleHealthWidget } from '@/components/home/ModuleHealthWidget';
import RecentVisitsWidget from '@/components/home/RecentVisitsWidget';
import { HomeDashboardWidgetFrame } from './HomeDashboardRowShell';

function framed(context, widgetKey, label, children) {
  return (
    <HomeDashboardWidgetFrame
      key={widgetKey}
      context={context}
      widgetKey={widgetKey}
      label={label}
    >
      {children}
    </HomeDashboardWidgetFrame>
  );
}

export function renderRecentRow(context) {
  return context.isVisible('recent') && context.hasRecentVisits
    ? framed(context, 'recent', '최근 방문', <RecentVisitsWidget />)
    : null;
}

export function renderBriefingRow(context) {
  return context.isVisible('briefing') && context.briefing
    ? framed(context, 'briefing', '이번 달 브리핑', <BriefingWidget data={context.briefing} />)
    : null;
}

export function renderKpiRow(context) {
  return context.isVisible('kpi')
    ? framed(
        context,
        'kpi',
        'KPI 지표',
        <HomeKpiRow
          salesKpi={context.salesKpi}
          costKpi={context.costKpi}
          noteKpi={context.noteKpi}
          salesCount={context.salesCount}
          noteCount={context.noteCount}
        />
      )
    : null;
}

export function renderFreshnessRow(context) {
  return context.isVisible('freshness')
    ? framed(
        context,
        'freshness',
        '데이터 신선도',
        <DataFreshnessWidget
          freshness={context.uploadFreshness}
          backupReminder={context.backupReminder}
          isMain={context.isMain}
          router={context.router}
        />
      )
    : null;
}

export function renderHealthRow(context) {
  return context.isVisible('health')
    ? framed(
        context,
        'health',
        '모듈별 헬스체크',
        <ModuleHealthWidget
          freshness={context.uploadFreshness}
          backupReminder={context.backupReminder}
          issues={context.alertIssues}
          costAlertData={context.alertCostAlertData}
          todos={context.todos}
          pipeline={context.pipeline}
          isMain={context.isMain}
          router={context.router}
        />
      )
    : null;
}

export function renderChartsRow(context) {
  return context.isVisible('charts')
    ? framed(
        context,
        'charts',
        '차트 (트렌드 · 카테고리)',
        <HomeChartRow
          trend={context.trend}
          donut={context.donut}
          hoveredCat={context.hoveredCat}
          setHoveredCat={context.setHoveredCat}
          chartTab={context.chartTab}
          setChartTab={context.setChartTab}
          chartKey={context.chartKey}
          salesKpi={context.salesKpi}
          router={context.router}
          isTrendEmpty={context.isTrendEmpty}
        />
      )
    : null;
}

export function renderQuickNoteRow(context) {
  return context.isVisible('quicknote') ? (
    <HomeQuickNoteWidget
      key="quicknote"
      quickNote={context.quickNote}
      quickSaved={context.quickSaved}
      onQuickNoteChange={context.onQuickNoteChange}
      onSave={context.onSaveQuickNote}
      onOpenDraft={context.onOpenQuickNoteDraft}
    />
  ) : null;
}

export function renderActivitiesRow(context) {
  return context.isVisible('activities')
    ? framed(
        context,
        'activities',
        '최근 활동',
        <HomeActivities activities={context.activities} router={context.router} />
      )
    : null;
}
