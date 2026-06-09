import { describe, expect, test } from '@jest/globals';
import {
  HOME_WIDGET_ROWS,
  reconcileWidgetFavorites,
  reconcileWidgetOrder,
  sanitizeWidgetCollapsed,
  sanitizeWidgetConfig,
} from '../../hooks/useWidgetConfig.js';

const DEFAULT_ORDER = HOME_WIDGET_ROWS.map(row => row.id);

describe('useWidgetConfig helpers', () => {
  test('visibility 설정에서 알 수 없는 key와 boolean이 아닌 값은 제거한다', () => {
    expect(
      sanitizeWidgetConfig({
        kpi: false,
        recent: true,
        ghost: false,
        notes: 'false',
      })
    ).toEqual({
      kpi: false,
      recent: true,
    });

    expect(sanitizeWidgetConfig(['kpi'])).toEqual({});
  });

  test('collapsed 설정도 위젯 key와 boolean 값만 유지한다', () => {
    expect(
      sanitizeWidgetCollapsed({
        heatmap: true,
        quickreport: false,
        stale: true,
        samples: 1,
      })
    ).toEqual({
      heatmap: true,
      quickreport: false,
    });
  });

  test('위젯 순서는 중복과 알 수 없는 row id를 제거하고 누락된 기본 row를 보충한다', () => {
    const result = reconcileWidgetOrder(['charts', 'ghost', 'kpi', 'charts']);

    expect(result.slice(0, 2)).toEqual(['charts', 'kpi']);
    expect(result).toHaveLength(DEFAULT_ORDER.length);
    expect(new Set(result).size).toBe(DEFAULT_ORDER.length);
    expect(result).toEqual(expect.arrayContaining(DEFAULT_ORDER));
  });

  test('즐겨찾기는 알 수 없는 row id와 중복을 제거한다', () => {
    expect(reconcileWidgetFavorites(['kpi', 'ghost', 'kpi', 'recent'])).toEqual(['kpi', 'recent']);
    expect(reconcileWidgetFavorites('kpi')).toEqual([]);
  });
});
