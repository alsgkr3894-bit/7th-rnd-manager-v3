import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/report/sales/page.jsx'), 'utf8');
const dataHookSource = readFileSync(resolve('app/report/sales/useSalesReportData.js'), 'utf8');
const utilsSource = readFileSync(resolve('app/report/sales/salesReportPageUtils.js'), 'utf8');
const computedSource = readFileSync(resolve('app/report/sales/useSalesReportComputed.js'), 'utf8');

describe('sales report page structure', () => {
  test('page delegates data loading to useSalesReportData', () => {
    expect(pageSource).not.toContain("getAll('sales_rows')");
    expect(pageSource).not.toContain('getUserExcluded');
    expect(pageSource).not.toContain('getUserRules');
    expect(pageSource).toContain('useSalesReportData');
  });

  test('page delegates stats and compare to useSalesReportComputed', () => {
    expect(pageSource).not.toContain('buildPeriodCompare');
    expect(pageSource).not.toContain('buildSalesStats');
    expect(pageSource).toContain('useSalesReportComputed');
  });

  test('page imports normalizeViewMode from salesReportPageUtils', () => {
    expect(pageSource).not.toContain('function normalizeViewMode');
    expect(pageSource).toContain('normalizeViewMode');
  });

  test('salesReportPageUtils exports normalizeViewMode', () => {
    expect(utilsSource).toContain('export function normalizeViewMode');
  });

  test('useSalesReportData contains raw data loading calls', () => {
    expect(dataHookSource).toContain("getAll('sales_rows')");
    expect(dataHookSource).toContain('getUserExcluded');
    expect(dataHookSource).toContain('getUserRules');
    expect(dataHookSource).toContain('export function useSalesReportData');
  });

  test('useSalesReportComputed contains buildSalesStats and buildPeriodCompare', () => {
    expect(computedSource).toContain('buildSalesStats');
    expect(computedSource).toContain('buildPeriodCompare');
    expect(computedSource).toContain('export function useSalesReportComputed');
  });
});
