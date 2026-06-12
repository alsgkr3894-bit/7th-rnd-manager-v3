'use client';
import { useState, useEffect } from 'react';
import { getJSONLS, setJSONLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';
import {
  HOME_WIDGET_ROWS,
  HOME_WIDGET_DEFS,
  DEFAULT_ORDER,
  ALL_ROW_IDS,
  ALL_WIDGET_KEYS,
  sanitizeWidgetConfig,
  sanitizeWidgetCollapsed,
  reconcileWidgetOrder,
  reconcileWidgetFavorites,
  normalizeWidgetKeys,
  visibleRowCount,
} from '@/lib/home/widget-config-utils';

export {
  HOME_WIDGET_ROWS,
  HOME_WIDGET_DEFS,
  sanitizeWidgetConfig,
  sanitizeWidgetCollapsed,
  reconcileWidgetOrder,
  reconcileWidgetFavorites,
};

/**
 * 홈 위젯 표시/숨김 + 접기/펼치기 + 드래그 순서를 localStorage에 영속 관리.
 */
export function useWidgetConfig() {
  const [config, setConfig] = useState({});
  const [collapsed, setCollapsed] = useState({});
  const [widgetOrder, setWidgetOrder] = useState(DEFAULT_ORDER);
  const [favorites, setFavorites] = useState([]); // 즐겨찾기 row id 목록
  const [favOnly, setFavOnlyState] = useState(false); // 즐겨찾기만 보기(포커스 모드)

  useEffect(() => {
    // ── config (visibility) — 마이그레이션 안전장치 적용 ──
    const rawVis = getJSONLS(KEYS.HOME_WIDGETS);
    const cleanVis = sanitizeWidgetConfig(rawVis);
    if (Object.keys(cleanVis).length !== Object.keys(rawVis || {}).length) {
      // stale key가 있었으면 정리된 값으로 재저장
      setJSONLS(KEYS.HOME_WIDGETS, cleanVis);
    }
    setConfig(cleanVis);

    // ── collapsed ──
    const savedCol = getJSONLS(KEYS.HOME_WIDGET_COLLAPSED);
    const cleanCol = sanitizeWidgetCollapsed(savedCol);
    if (Object.keys(cleanCol).length !== Object.keys(savedCol || {}).length) {
      setJSONLS(KEYS.HOME_WIDGET_COLLAPSED, cleanCol);
    }
    setCollapsed(cleanCol);

    // ── order — stale id 제거 + 누락 id 추가 ──
    const savedOrder = getJSONLS(KEYS.HOME_WIDGET_ORDER);
    if (Array.isArray(savedOrder)) {
      const reconciled = reconcileWidgetOrder(savedOrder);
      setWidgetOrder(reconciled);
      if (reconciled.join(',') !== savedOrder.join(',')) {
        setJSONLS(KEYS.HOME_WIDGET_ORDER, reconciled);
      }
    }

    // ── favorites — stale row id 제거 (config 정리와 연동) ──
    const savedFav = getJSONLS(KEYS.HOME_WIDGET_FAVORITES);
    if (Array.isArray(savedFav)) {
      // config에서 전체 hidden된 row는 favorites에서도 제거 (보이지 않는 row 고정 방지)
      const keptFav = reconcileWidgetFavorites(savedFav).filter(rowId => {
        const row = HOME_WIDGET_ROWS.find(r => r.id === rowId);
        if (!row) return false;
        // 모든 key가 false로 명시된 경우만 제거, 기본값(없음=true)은 유지
        return row.keys.some(k => cleanVis[k] !== false);
      });
      setFavorites(keptFav);
      if (keptFav.join(',') !== savedFav.join(',')) {
        setJSONLS(KEYS.HOME_WIDGET_FAVORITES, keptFav);
      }
    }

    const savedFavOnly = getJSONLS(KEYS.HOME_WIDGET_FAV_ONLY);
    if (typeof savedFavOnly === 'boolean') setFavOnlyState(savedFavOnly);
  }, []);

  const isVisible = key => config[key] !== false;

  // 함수형 업데이트 — 같은 tick에 여러 key를 토글해도 stale config로 덮어쓰지 않음
  const toggle = key => {
    if (!ALL_WIDGET_KEYS.has(key)) return;
    setConfig(prev => {
      const next = { ...prev, [key]: prev[key] === false };
      setJSONLS(KEYS.HOME_WIDGETS, next);
      return next;
    });
  };

  /** 한 행(쌍 위젯 포함)의 모든 key를 한 번에 토글 — 모두 보이면 숨기고, 아니면 모두 표시.
   *  숨기는 방향일 때, 해당 행이 마지막 visible 행이면 토글을 차단(빈 대시보드 방지). */
  const toggleRow = keys => {
    const rowKeys = normalizeWidgetKeys(keys);
    if (rowKeys.length === 0) return;
    setConfig(prev => {
      const allVisible = rowKeys.every(k => prev[k] !== false);
      if (allVisible && visibleRowCount(prev) <= 1) return prev; // 마지막 행 — 차단
      const next = { ...prev };
      rowKeys.forEach(k => {
        next[k] = allVisible ? false : true;
      });
      setJSONLS(KEYS.HOME_WIDGETS, next);
      return next;
    });
  };

  const isCollapsed = key => collapsed[key] === true;

  const toggleCollapse = key => {
    if (!ALL_WIDGET_KEYS.has(key)) return;
    const next = { ...collapsed, [key]: !collapsed[key] };
    setCollapsed(next);
    setJSONLS(KEYS.HOME_WIDGET_COLLAPSED, next);
  };

  const reorderWidgets = newOrder => {
    const reconciled = reconcileWidgetOrder(newOrder);
    setWidgetOrder(reconciled);
    setJSONLS(KEYS.HOME_WIDGET_ORDER, reconciled);
  };

  // ── 즐겨찾기 ──
  const isFavorite = id => favorites.includes(id);

  // 함수형 업데이트 — 같은 tick 다중 호출 안전
  const toggleFavorite = id => {
    if (!ALL_ROW_IDS.has(id)) return;
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setJSONLS(KEYS.HOME_WIDGET_FAVORITES, next);
      return next;
    });
  };

  const setFavOnly = val => {
    const next = Boolean(val);
    setFavOnlyState(next);
    setJSONLS(KEYS.HOME_WIDGET_FAV_ONLY, next);
  };

  // 즐겨찾기 행을 앞으로, 나머지는 widgetOrder 순서 유지한 최종 렌더 순서
  const favSet = new Set(favorites);
  const effectiveOrder = [
    ...widgetOrder.filter(id => favSet.has(id)),
    ...widgetOrder.filter(id => !favSet.has(id)),
  ];

  /** 모든 위젯 설정을 기본값으로 복원 (localStorage 5개 키 모두 초기화) */
  const resetConfig = () => {
    setConfig({});
    setCollapsed({});
    setWidgetOrder(DEFAULT_ORDER);
    setFavorites([]);
    setFavOnlyState(false);
    setJSONLS(KEYS.HOME_WIDGETS, {});
    setJSONLS(KEYS.HOME_WIDGET_COLLAPSED, {});
    setJSONLS(KEYS.HOME_WIDGET_ORDER, DEFAULT_ORDER);
    setJSONLS(KEYS.HOME_WIDGET_FAVORITES, []);
    setJSONLS(KEYS.HOME_WIDGET_FAV_ONLY, false);
  };

  return {
    config,
    isVisible,
    toggle,
    toggleRow,
    isCollapsed,
    toggleCollapse,
    widgetOrder,
    reorderWidgets,
    favorites,
    isFavorite,
    toggleFavorite,
    favOnly,
    setFavOnly,
    effectiveOrder,
    resetConfig,
  };
}
