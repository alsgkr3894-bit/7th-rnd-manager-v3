'use client';
import { useState, useEffect } from 'react';
import { getJSONLS, setJSONLS } from '@/lib/note/storage';
import { KEYS } from '@/lib/note/keys';

/** 홈 위젯 정의 (표시 순서·라벨) */
export const HOME_WIDGET_DEFS = [
  { key: 'recent',      label: '최근 방문' },
  { key: 'briefing',    label: '이번 달 브리핑' },
  { key: 'kpi',         label: 'KPI 지표' },
  { key: 'todo',        label: '오늘 할 일' },
  { key: 'unmatched',   label: '미매칭 메뉴 처리' },
  { key: 'pipeline',    label: '신메뉴 파이프라인' },
  { key: 'schedule',    label: '이번 주 개발 일정' },
  { key: 'ranks',       label: '판매 순위 (베스트/워스트)' },
  { key: 'charts',      label: '차트 (트렌드 · 카테고리)' },
  { key: 'pricechange', label: '식자재 단가 변동' },
  { key: 'costalert',   label: '원가율 경보' },
  { key: 'quicknote',   label: '빠른 메모' },
  { key: 'quickreport', label: '보고서 빠른 생성' },
  { key: 'notes',       label: '보고예정 노트' },
  { key: 'samples',     label: '샘플 기록' },
  { key: 'heatmap',     label: '노트 히트맵' },
  { key: 'activities',  label: '최근 활동' },
];

/**
 * 홈 위젯 표시/숨김 설정을 localStorage(KEYS.HOME_WIDGETS)에 영속 관리.
 * @returns {{ config: object, isVisible: (key:string)=>boolean, toggle: (key:string)=>void }}
 */
export function useWidgetConfig() {
  // SSR/하이드레이션 일치: 서버와 클라 첫 렌더 모두 {}(전부 표시)로 시작하고,
  // 마운트 직후 useEffect에서 저장된 설정을 읽어 적용한다. (lazy init에서 localStorage를
  // 직접 읽으면 서버=전부표시 vs 클라=일부숨김 불일치로 하이드레이션 오류가 난다)
  const [config, setConfig] = useState({});

  useEffect(() => {
    const saved = getJSONLS(KEYS.HOME_WIDGETS);
    if (saved && typeof saved === 'object') setConfig(saved);
  }, []);

  const isVisible = (key) => config[key] !== false;

  const toggle = (key) => {
    const next = { ...config, [key]: config[key] === false };
    setConfig(next);
    setJSONLS(KEYS.HOME_WIDGETS, next);
  };

  return { config, isVisible, toggle };
}
