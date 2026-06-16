export function smoothAreaPath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const t = 0.18;
    const cp1x = p1[0] + (p2[0] - p0[0]) * t;
    const cp1y = p1[1] + (p2[1] - p0[1]) * t;
    const cp2x = p2[0] - (p3[0] - p1[0]) * t;
    const cp2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)},${cp2x.toFixed(2)} ${cp2y.toFixed(2)},${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

export function niceAreaStep(x) {
  if (x <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / mag;
  const m = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return m * mag;
}

export function calcAreaTicks(dataMax, count = 4) {
  if (dataMax <= 0) return Array.from({ length: count + 1 }, (_, i) => i * 250);
  let step = niceAreaStep(dataMax / count);
  while (step * count < dataMax) step = niceAreaStep(step * 1.5);
  return Array.from({ length: count + 1 }, (_, i) => step * i);
}

export function getAreaPointCount(labels, series) {
  return labels.length || Math.max(0, ...series.map(item => item.data.length));
}

export function getAreaDataMax(series) {
  const values = series.flatMap(item => item.data).filter(value => Number.isFinite(value));
  return Math.max(...values, 1);
}

export function getAreaNiceMax(ticks) {
  return ticks[ticks.length - 1] * 1.04;
}

export function createAreaScale({ pointCount, niceMax }) {
  return {
    pointCount,
    xPct: index => (pointCount <= 1 ? 50 : (index / (pointCount - 1)) * 100),
    yPct: value => 100 - Math.min(Math.max((value / niceMax) * 100, 0), 100),
  };
}

export function buildAreaPaths(series, scale) {
  if (scale.pointCount === 0) return series.map(() => ({ pts: [], line: '', area: '' }));
  return series.map(item => {
    const pts = item.data.map((value, index) => [scale.xPct(index), scale.yPct(value)]);
    const line = smoothAreaPath(pts);
    const area =
      pts.length > 0
        ? line +
          ` L ${scale.xPct(pts.length - 1).toFixed(2)} 100 L ${scale.xPct(0).toFixed(2)} 100 Z`
        : '';
    return { pts, line, area };
  });
}

export function findNearestAreaIndex({ pointCount, pointerX, rect, xPct }) {
  if (pointCount === 0 || !rect?.width) return null;
  const pct = (pointerX - rect.left) / rect.width;
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < pointCount; index++) {
    const distance = Math.abs(xPct(index) / 100 - pct);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}
