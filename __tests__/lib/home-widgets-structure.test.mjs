import { readFileSync } from 'fs';
import { resolve } from 'path';

const widgetsSource = readFileSync(resolve('components/home/HomeWidgets.jsx'), 'utf8');
const sampleSource = readFileSync(resolve('components/home/SampleStatsWidget.jsx'), 'utf8');
const quickReportSource = readFileSync(resolve('components/home/QuickReportWidget.jsx'), 'utf8');

describe('home widgets structure', () => {
  test('HomeWidgets keeps shared exports and delegates heavier widgets', () => {
    expect(widgetsSource).toContain('export { SampleStatsWidget }');
    expect(widgetsSource).not.toContain('CostAlertWidget'); // 2026-10-13 홈 원가율 경보 위젯 삭제
    expect(widgetsSource).toContain('export { QuickReportWidget }');
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
    expect(sampleSource).toContain('SAMPLE_RECORD_LABEL');
    expect(quickReportSource).toContain('export function QuickReportWidget');
    expect(quickReportSource).toContain('const REPORT_LINKS');
    expect(quickReportSource).toContain('보고서 빠른 생성');
  });
});
