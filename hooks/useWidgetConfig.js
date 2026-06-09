'use client';
import { useState, useEffect } from 'react';
import { getJSONLS, setJSONLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';

/** 드래그 단위 위젯 행 정의 (row id + 포함된 위젯 key 목록 + 라벨) */
export const HOME_WIDGET_ROWS = [
  { id: 'recent', keys: ['recent'], label: '최근 방문' },
  { id: 'briefing', keys: ['briefing'], label: '이번 달 브리핑' },
  { id: 'kpi', keys: ['kpi'], label: 'KPI 지표' },
  { id: 'freshness', keys: ['freshness'], label: '데이터 신선도' },
  { id: 'health', keys: ['health'], label: '모듈별 헬스체크' },
  { id: 'todo-pair', keys: ['todo', 'unmatched'], label: '오늘 할 일 · 미매칭' },
  { id: 'pipeline-pair', keys: ['pipeline', 'schedule'], label: '파이프라인 · 주간 일정' },
  { id: 'ranks', keys: ['ranks'], label: '판매 순위' },
  { id: 'charts', keys: ['charts'], label: '차트' },
  { id: 'price-pair', keys: ['pricechange', 'costalert'], label: '단가 변동 · 원가율 경보' },
  { id: 'quicknote', keys: ['quicknote'], label: '빠른 메모' },
  { id: 'notes-pair', keys: ['notes', 'samples'], label: '보고예정 노트 · 샘플 기록' },
  { id: 'heat-pair', keys: ['heatmap', 'quickreport'], label: '노트 히트맵 · 보고서 빠른 생성' },
  { id: 'activities', keys: ['activities'], label: '최근 활동' },
];

/** 개별 위젯 toggle용 정의 (기존 호환) */
export const HOME_WIDGET_DEFS = HOME_WIDGET_ROWS.flatMap(row =>
  row.keys.map(key => ({ key, label: row.label }))
);

const DEFAULT_ORDER = HOME_WIDGET_ROWS.map(r => r.id);
const ALL_ROW_IDS = new Set(DEFAULT_ORDER);
const ALL_WIDGET_KEYS = new Set(HOME_WIDGET_ROWS.flatMap(r => r.keys));

/** config 객체에서 알 수 없는 key나 boolean이 아닌 값을 제거 */
export function sanitizeWidgetConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (ALL_WIDGET_KEYS.has(k) && typeof v === 'boolean') out[k] = v;
  }
  return out;
}

/** collapsed 객체에서 알 수 없는 key나 boolean이 아닌 값을 제거 */
export function sanitizeWidgetCollapsed(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (ALL_WIDGET_KEYS.has(k) && typeof v === 'boolean') out[k] = v;
  }
  return out;
}

/** 저장된 rowId 배열을 DEFAULT_ORDER와 reconcile — 불명 제거, 누락 추가 */
export function reconcileWidgetOrder(saved) {
  const source = Array.isArray(saved) ? saved : [];
  const kept = [...new Set(source.filter(id => ALL_ROW_IDS.has(id)))];
  const missing = DEFAULT_ORDER.filter(id => !kept.includes(id));
  return [...kept, ...missing];
}

/** 저장된 favorites 배열 reconcile */
export function reconcileWidgetFavorites(saved) {
  const source = Array.isArray(saved) ? saved : [];
  return [...new Set(source.filter(id => ALL_ROW_IDS.has(id)))];
}

function normalizeWidgetKeys(keys) {
  return Array.isArray(keys) ? keys.filter(key => ALL_WIDGET_KEYS.has(key)) : [];
}

/** 현재 config 기준 보이는 행 수 (빈 대시보드 방지용) */
function visibleRowCount(cfg) {
  const cleanConfig = sanitizeWidgetConfig(cfg);
  return HOME_WIDGET_ROWS.filter(row => row.keys.every(k => cleanConfig[k] !== false)).length;
}

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
