'use client';
import { useState, useEffect } from 'react';
import { getJSONLS, setJSONLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';

/** 드래그 단위 위젯 행 정의 (row id + 포함된 위젯 key 목록 + 라벨) */
export const HOME_WIDGET_ROWS = [
  { id: 'recent',        keys: ['recent'],                   label: '최근 방문' },
  { id: 'briefing',      keys: ['briefing'],                 label: '이번 달 브리핑' },
  { id: 'kpi',           keys: ['kpi'],                      label: 'KPI 지표' },
  { id: 'todo-pair',     keys: ['todo', 'unmatched'],        label: '오늘 할 일 · 미매칭' },
  { id: 'pipeline-pair', keys: ['pipeline', 'schedule'],     label: '파이프라인 · 주간 일정' },
  { id: 'ranks',         keys: ['ranks'],                    label: '판매 순위' },
  { id: 'charts',        keys: ['charts'],                   label: '차트' },
  { id: 'price-pair',    keys: ['pricechange', 'costalert'], label: '단가 변동 · 원가율 경보' },
  { id: 'quicknote',     keys: ['quicknote'],                label: '빠른 메모' },
  { id: 'notes-pair',    keys: ['notes', 'samples'],         label: '보고예정 노트 · 샘플 기록' },
  { id: 'heat-pair',     keys: ['heatmap', 'quickreport'],   label: '노트 히트맵 · 보고서 빠른 생성' },
  { id: 'activities',    keys: ['activities'],               label: '최근 활동' },
];

/** 개별 위젯 toggle용 정의 (기존 호환) */
export const HOME_WIDGET_DEFS = HOME_WIDGET_ROWS.flatMap(row =>
  row.keys.map(key => ({ key, label: row.label }))
);

const DEFAULT_ORDER = HOME_WIDGET_ROWS.map(r => r.id);

/**
 * 홈 위젯 표시/숨김 + 접기/펼치기 + 드래그 순서를 localStorage에 영속 관리.
 */
export function useWidgetConfig() {
  const [config,    setConfig]    = useState({});
  const [collapsed, setCollapsed] = useState({});
  const [widgetOrder, setWidgetOrder] = useState(DEFAULT_ORDER);
  const [favorites,  setFavorites]  = useState([]);   // 즐겨찾기 row id 목록
  const [favOnly,    setFavOnlyState] = useState(false); // 즐겨찾기만 보기(포커스 모드)

  useEffect(() => {
    const savedVis = getJSONLS(KEYS.HOME_WIDGETS);
    if (savedVis && typeof savedVis === 'object') setConfig(savedVis);

    const savedCol = getJSONLS(KEYS.HOME_WIDGET_COLLAPSED);
    if (savedCol && typeof savedCol === 'object') setCollapsed(savedCol);

    // 저장된 순서를 현재 row 집합과 reconcile:
    //   - 알 수 없는(이름변경·삭제된) id는 버리고
    //   - 새로 추가된 id는 끝에 덧붙인다
    // length만 비교하면 같은 길이의 stale 저장값이 위젯을 영구히 사라지게 할 수 있다.
    const savedOrder = getJSONLS(KEYS.HOME_WIDGET_ORDER);
    if (Array.isArray(savedOrder)) {
      const known = new Set(DEFAULT_ORDER);
      const kept = [...new Set(savedOrder.filter(id => known.has(id)))];
      const missing = DEFAULT_ORDER.filter(id => !kept.includes(id));
      const reconciled = [...kept, ...missing];
      setWidgetOrder(reconciled);
      if (reconciled.join(',') !== savedOrder.join(',')) {
        setJSONLS(KEYS.HOME_WIDGET_ORDER, reconciled); // 정리된 순서 재저장
      }
    }

    // 즐겨찾기 — stale id는 버린다(순서 reconcile과 동일 패턴)
    const savedFav = getJSONLS(KEYS.HOME_WIDGET_FAVORITES);
    if (Array.isArray(savedFav)) {
      const known = new Set(DEFAULT_ORDER);
      const keptFav = [...new Set(savedFav.filter(id => known.has(id)))];
      setFavorites(keptFav);
      if (keptFav.join(',') !== savedFav.join(',')) {
        setJSONLS(KEYS.HOME_WIDGET_FAVORITES, keptFav);
      }
    }

    const savedFavOnly = getJSONLS(KEYS.HOME_WIDGET_FAV_ONLY);
    if (typeof savedFavOnly === 'boolean') setFavOnlyState(savedFavOnly);
  }, []);

  const isVisible = (key) => config[key] !== false;

  // 함수형 업데이트 — 같은 tick에 여러 key를 토글해도 stale config로 덮어쓰지 않음
  const toggle = (key) => {
    setConfig(prev => {
      const next = { ...prev, [key]: prev[key] === false };
      setJSONLS(KEYS.HOME_WIDGETS, next);
      return next;
    });
  };

  /** 한 행(쌍 위젯 포함)의 모든 key를 한 번에 토글 — 모두 보이면 숨기고, 아니면 모두 표시 */
  const toggleRow = (keys) => {
    setConfig(prev => {
      const allVisible = keys.every(k => prev[k] !== false);
      const next = { ...prev };
      keys.forEach(k => { next[k] = allVisible ? false : true; });
      setJSONLS(KEYS.HOME_WIDGETS, next);
      return next;
    });
  };

  const isCollapsed = (key) => collapsed[key] === true;

  const toggleCollapse = (key) => {
    const next = { ...collapsed, [key]: !collapsed[key] };
    setCollapsed(next);
    setJSONLS(KEYS.HOME_WIDGET_COLLAPSED, next);
  };

  const reorderWidgets = (newOrder) => {
    setWidgetOrder(newOrder);
    setJSONLS(KEYS.HOME_WIDGET_ORDER, newOrder);
  };

  // ── 즐겨찾기 ──
  const isFavorite = (id) => favorites.includes(id);

  // 함수형 업데이트 — 같은 tick 다중 호출 안전
  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setJSONLS(KEYS.HOME_WIDGET_FAVORITES, next);
      return next;
    });
  };

  const setFavOnly = (val) => {
    setFavOnlyState(val);
    setJSONLS(KEYS.HOME_WIDGET_FAV_ONLY, val);
  };

  // 즐겨찾기 행을 앞으로, 나머지는 widgetOrder 순서 유지한 최종 렌더 순서
  const favSet = new Set(favorites);
  const effectiveOrder = [
    ...widgetOrder.filter(id => favSet.has(id)),
    ...widgetOrder.filter(id => !favSet.has(id)),
  ];

  return {
    config, isVisible, toggle, toggleRow,
    isCollapsed, toggleCollapse,
    widgetOrder, reorderWidgets,
    favorites, isFavorite, toggleFavorite,
    favOnly, setFavOnly, effectiveOrder,
  };
}
