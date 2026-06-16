'use client';
import { useId, useMemo, useRef, useState } from 'react';
import { fmtShort } from '@/lib/format';
import {
  normalizeAreaSeries,
  normalizeChartColors,
  normalizeChartDimension,
  normalizeChartFormatter,
  normalizeChartLabels,
} from '@/lib/ui/chart-data';
import { AreaChartSvg } from './area-chart/AreaChartSvg';
import { AreaTooltip } from './area-chart/AreaTooltip';
import { AreaXAxisLabels } from './area-chart/AreaXAxisLabels';
import { AreaYAxisLabels } from './area-chart/AreaYAxisLabels';
import {
  buildAreaPaths,
  calcAreaTicks,
  createAreaScale,
  findNearestAreaIndex,
  getAreaDataMax,
  getAreaNiceMax,
  getAreaPointCount,
} from './area-chart/areaChartUtils';

const Y_LABEL_WIDTH = 46;
const X_LABEL_HEIGHT = 24;
const TICK_COUNT = 4;

export function AreaChart({
  series,
  labels,
  height = 200,
  colors = ['#1D766F', '#7C3AED'],
  formatY,
}) {
  const formatValue = normalizeChartFormatter(formatY, fmtShort);
  const safeSeries = useMemo(() => normalizeAreaSeries(series), [series]);
  const safeLabels = useMemo(() => normalizeChartLabels(labels), [labels]);
  const safeColors = useMemo(() => normalizeChartColors(colors), [colors]);
  const [hover, setHover] = useState(null);
  const svgWrapRef = useRef(null);
  const reactId = useId();
  const uid = `ac-${reactId.replace(/:/g, '')}`;

  const chartHeight = normalizeChartDimension(height, 200, { min: 80, max: 1200 });
  const pointCount = getAreaPointCount(safeLabels, safeSeries);
  const dataMax = getAreaDataMax(safeSeries);
  const ticks = useMemo(() => calcAreaTicks(dataMax, TICK_COUNT), [dataMax]);
  const niceMax = getAreaNiceMax(ticks);
  const scale = useMemo(
    () => createAreaScale({ pointCount, niceMax }),
    [pointCount, niceMax]
  );
  const paths = useMemo(() => buildAreaPaths(safeSeries, scale), [safeSeries, scale]);

  function handleMouseMove(event) {
    if (!svgWrapRef.current || pointCount === 0) return;
    const nearestIndex = findNearestAreaIndex({
      pointCount,
      pointerX: event.clientX,
      rect: svgWrapRef.current.getBoundingClientRect(),
      xPct: scale.xPct,
    });
    if (nearestIndex != null) setHover(nearestIndex);
  }

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <div style={{ display: 'flex' }}>
        <AreaYAxisLabels
          ticks={ticks}
          yPct={scale.yPct}
          formatValue={formatValue}
          width={Y_LABEL_WIDTH}
          height={chartHeight}
        />

        <div
          ref={svgWrapRef}
          style={{
            flex: 1,
            height: chartHeight,
            position: 'relative',
            cursor: pointCount > 0 ? 'crosshair' : 'default',
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          <AreaChartSvg
            paths={paths}
            ticks={ticks}
            yPct={scale.yPct}
            xPct={scale.xPct}
            hover={hover}
            uid={uid}
            series={safeSeries}
            colors={safeColors}
          />
          <AreaTooltip
            hover={hover}
            pointCount={pointCount}
            xPct={scale.xPct}
            labels={safeLabels}
            series={safeSeries}
            colors={safeColors}
            formatValue={formatValue}
          />
        </div>
      </div>

      <AreaXAxisLabels
        labels={safeLabels}
        pointCount={pointCount}
        hover={hover}
        xPct={scale.xPct}
        yWidth={Y_LABEL_WIDTH}
        height={X_LABEL_HEIGHT}
      />
    </div>
  );
}
