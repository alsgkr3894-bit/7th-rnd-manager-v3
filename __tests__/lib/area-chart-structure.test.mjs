import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildAreaPaths,
  calcAreaTicks,
  createAreaScale,
  findNearestAreaIndex,
  getAreaDataMax,
  getAreaNiceMax,
  getAreaPointCount,
  smoothAreaPath,
} from '../../components/charts/area-chart/areaChartUtils.js';

const chartSource = readFileSync(resolve('components/charts/AreaChart.jsx'), 'utf8');
const svgSource = readFileSync(resolve('components/charts/area-chart/AreaChartSvg.jsx'), 'utf8');
const tooltipSource = readFileSync(resolve('components/charts/area-chart/AreaTooltip.jsx'), 'utf8');
const xAxisSource = readFileSync(
  resolve('components/charts/area-chart/AreaXAxisLabels.jsx'),
  'utf8'
);
const yAxisSource = readFileSync(
  resolve('components/charts/area-chart/AreaYAxisLabels.jsx'),
  'utf8'
);
const utilsSource = readFileSync(resolve('components/charts/area-chart/areaChartUtils.js'), 'utf8');

describe('area chart helpers', () => {
  test('smooth path handles empty, single, and multi-point paths', () => {
    expect(smoothAreaPath([])).toBe('');
    expect(smoothAreaPath([[50, 20]])).toBe('M 50.00 20.00');
    expect(
      smoothAreaPath([
        [0, 100],
        [50, 50],
        [100, 0],
      ])
    ).toContain(' C ');
  });

  test('tick and scale helpers preserve original chart coordinate policy', () => {
    const ticks = calcAreaTicks(0, 4);
    expect(ticks).toEqual([0, 250, 500, 750, 1000]);
    expect(calcAreaTicks(1200, 4).at(-1)).toBeGreaterThanOrEqual(1200);
    expect(getAreaNiceMax([0, 100, 200])).toBe(208);

    const scale = createAreaScale({ pointCount: 3, niceMax: 100 });
    expect(scale.xPct(0)).toBe(0);
    expect(scale.xPct(1)).toBe(50);
    expect(scale.xPct(2)).toBe(100);
    expect(scale.yPct(25)).toBe(75);
  });

  test('path and hover helpers match series point layout', () => {
    const scale = createAreaScale({ pointCount: 3, niceMax: 100 });
    const paths = buildAreaPaths([{ name: 'A', data: [0, 50, 100] }], scale);

    expect(getAreaPointCount([], [{ data: [1, 2, 3] }])).toBe(3);
    expect(getAreaPointCount(['1월'], [{ data: [1, 2, 3] }])).toBe(1);
    expect(getAreaDataMax([{ data: [0, 50, Number.NaN] }])).toBe(50);
    expect(paths[0].pts).toEqual([
      [0, 100],
      [50, 50],
      [100, 0],
    ]);
    expect(paths[0].area).toMatch(/ L 100\.00 100 L 0\.00 100 Z$/);
    expect(
      findNearestAreaIndex({
        pointCount: 3,
        pointerX: 90,
        rect: { left: 0, width: 100 },
        xPct: scale.xPct,
      })
    ).toBe(2);
  });
});

describe('area chart structure', () => {
  test('AreaChart normalizes input and delegates axes, svg, tooltip, and path math', () => {
    expect(chartSource).toContain('export function AreaChart');
    expect(chartSource).toContain('normalizeAreaSeries(series)');
    expect(chartSource).toContain('normalizeChartLabels(labels)');
    expect(chartSource).toContain('normalizeChartColors(colors)');
    expect(chartSource).toContain('<AreaYAxisLabels');
    expect(chartSource).toContain('<AreaChartSvg');
    expect(chartSource).toContain('<AreaTooltip');
    expect(chartSource).toContain('<AreaXAxisLabels');
    expect(chartSource).toContain('findNearestAreaIndex({');
    expect(chartSource).not.toContain('function smoothPath');
    expect(chartSource).not.toContain('function calcTicks');
    expect(chartSource).not.toContain('<linearGradient');
    expect(chartSource).not.toContain('labels[hover]');
    expect(chartSource).not.toContain('safeLabels.map((l, i)');
  });

  test('split area chart files own rendering and utility details', () => {
    expect(svgSource).toContain('export function AreaChartSvg');
    expect(svgSource).toContain('<linearGradient');
    expect(svgSource).toContain('strokeDasharray="2 1.8"');
    expect(svgSource).toContain('paths.map');
    expect(svgSource).toContain('<circle');

    expect(tooltipSource).toContain('export function AreaTooltip');
    expect(tooltipSource).toContain('labels[hover]');
    expect(tooltipSource).toContain('formatValue(item.data[hover] ?? 0)');
    expect(tooltipSource).toContain('minWidth: 148');

    expect(xAxisSource).toContain('export function AreaXAxisLabels');
    expect(xAxisSource).toContain('labels.map');
    expect(xAxisSource).toContain('hover === index ? 800 : 600');
    expect(yAxisSource).toContain('export function AreaYAxisLabels');
    expect(yAxisSource).toContain('formatValue(value)');
    expect(utilsSource).toContain('export function smoothAreaPath');
    expect(utilsSource).toContain('export function calcAreaTicks');
    expect(utilsSource).toContain('export function buildAreaPaths');
  });
});
