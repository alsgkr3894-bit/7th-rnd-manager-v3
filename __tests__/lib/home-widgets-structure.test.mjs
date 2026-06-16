import { readFileSync } from 'fs';
import { resolve } from 'path';

const widgetsSource = readFileSync(resolve('components/home/HomeWidgets.jsx'), 'utf8');
const sampleSource = readFileSync(resolve('components/home/SampleStatsWidget.jsx'), 'utf8');
const costAlertSource = readFileSync(resolve('components/home/CostAlertWidget.jsx'), 'utf8');
const quickReportSource = readFileSync(resolve('components/home/QuickReportWidget.jsx'), 'utf8');

describe('home widgets structure', () => {
  test('HomeWidgets keeps shared exports and delegates heavier widgets', () => {
    expect(widgetsSource).toContain("export { SampleStatsWidget }");
    expect(widgetsSource).toContain("export { CostAlertWidget }");
    expect(widgetsSource).toContain("export { QuickReportWidget }");
    expect(widgetsSource).toContain('export function RankCard');
    expect(widgetsSource).toContain('export function ReportingNotesWidget');
    expect(widgetsSource).toContain('export function SkeletonChart');
    expect(widgetsSource).not.toContain('const REPORT_LINKS');
    expect(widgetsSource).not.toContain('function toTime');
    expect(widgetsSource).not.toContain('getCostRateStyles');
  });

  test('split home widgets own their presentation details', () => {
    expect(sampleSource).toContain('export function SampleStatsWidget');
    expect(sampleSource).toContain('function toTime');
    expect(sampleSource).toContain('샘플기록');
    expect(costAlertSource).toContain('export function CostAlertWidget');
    expect(costAlertSource).toContain('getCostRateStyles');
    expect(costAlertSource).toContain('원가율 경보');
    expect(quickReportSource).toContain('export function QuickReportWidget');
    expect(quickReportSource).toContain('const REPORT_LINKS');
    expect(quickReportSource).toContain('보고서 빠른 생성');
  });
});
