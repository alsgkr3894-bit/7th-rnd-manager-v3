import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  asPlainObject,
  formatReportDate,
} from '../../components/report/preview-pages/reportPreviewPageUtils.js';

const modalSource = readFileSync(resolve('components/report/_ReportPreviewModal.jsx'), 'utf8');
const pagesSource = readFileSync(resolve('components/report/ReportPreviewPages.jsx'), 'utf8');
const sidebarSource = readFileSync(resolve('components/report/ReportPreviewSidebar.jsx'), 'utf8');
const bodySource = readFileSync(resolve('components/report/ReportPreviewBody.jsx'), 'utf8');
const coverSource = readFileSync(
  resolve('components/report/preview-pages/ReportCover.jsx'),
  'utf8'
);
const optionsSource = readFileSync(
  resolve('components/report/preview-pages/ReportOptionsPage.jsx'),
  'utf8'
);
const summarySource = readFileSync(
  resolve('components/report/preview-pages/ReportSummaryPage.jsx'),
  'utf8'
);
const optionRowSource = readFileSync(
  resolve('components/report/preview-pages/ReportPreviewOptionRow.jsx'),
  'utf8'
);

describe('report preview modal structure', () => {
  test('ReportPreviewModal keeps modal state and delegates preview rendering', () => {
    expect(modalSource).toContain('export function ReportPreviewModal');
    expect(modalSource).toContain('<ReportPreviewSidebar');
    expect(modalSource).toContain('<ReportPreviewBody');
    expect(modalSource).toContain('printReportElements');
    expect(modalSource).toContain('printOnOpen');
    expect(modalSource).not.toContain('function ReportCover');
    expect(modalSource).not.toContain('REPORT_OPTION_RENDERERS');
    expect(modalSource).not.toContain('className="preview-pager"');
    expect(modalSource).not.toContain('보고서 설정');
  });

  test('split report preview components own page, sidebar, and pager UI', () => {
    expect(pagesSource).toContain('export const REPORT_PREVIEW_PAGES');
    expect(pagesSource).toContain('<ReportCover');
    expect(pagesSource).toContain('<ReportOptionsPage');
    expect(pagesSource).toContain('<ReportSummaryPage');
    expect(pagesSource).toContain('formatReportDate');
    expect(pagesSource).toContain('export function ReportPaper');
    expect(pagesSource).not.toContain('REPORT_OPTION_RENDERERS');
    expect(pagesSource.split('\n').length).toBeLessThanOrEqual(40);
    expect(coverSource).toContain('export function ReportCover');
    expect(coverSource).toContain('7번가피자 본사');
    expect(optionsSource).toContain('export function ReportOptionsPage');
    expect(optionsSource).toContain('REPORT_OPTION_RENDERERS');
    expect(summarySource).toContain('export function ReportSummaryPage');
    expect(summarySource).toContain('요약 정보');
    expect(optionRowSource).toContain('export function ReportPreviewOptionRow');
    expect(sidebarSource).toContain('export function ReportPreviewSidebar');
    expect(sidebarSource).toContain('preview-modal-title');
    expect(sidebarSource).toContain('Esc : 닫기');
    expect(bodySource).toContain('export function ReportPreviewBody');
    expect(bodySource).toContain('className="preview-pager"');
    expect(bodySource).toContain('<ReportPaper');
  });

  test('report preview page helpers keep object and date formatting guards stable', () => {
    expect(asPlainObject({ a: 1 })).toEqual({ a: 1 });
    expect(asPlainObject(null)).toEqual({});
    expect(asPlainObject([])).toEqual({});
    expect(formatReportDate(null)).toBe('—');
    expect(formatReportDate('not-a-date')).toBe('—');
    expect(formatReportDate(new Date('2026-06-16T00:00:00Z'), { year: 'numeric' })).toContain(
      '2026'
    );
  });
});
