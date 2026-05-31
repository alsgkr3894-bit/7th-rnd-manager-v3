'use client';
import { useState } from 'react';
import { KEYS } from '@/lib/note/keys';

/** 홈 위젯 정의 (표시 순서·라벨) */
export const HOME_WIDGET_DEFS = [
  { key: 'recent',      label: '최근 방문' },
  { key: 'kpi',         label: 'KPI 지표' },
  { key: 'quicknote',   label: '빠른 메모' },
  { key: 'charts',      label: '차트 (트렌드 · 카테고리)' },
  { key: 'ranks',       label: '판매 순위 (베스트/워스트)' },
  { key: 'costalert',   label: '원가율 경보' },
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
  const [config, setConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEYS.HOME_WIDGETS) || '{}'); }
    catch (err) { console.warn('[Home] storage access failed:', err); return {}; }
  });

  const isVisible = (key) => config[key] !== false;

  const toggle = (key) => {
    const next = { ...config, [key]: !isVisible(key) };
    setConfig(next);
    try { localStorage.setItem(KEYS.HOME_WIDGETS, JSON.stringify(next)); }
    catch (err) { console.warn('[Home] storage access failed:', err); }
  };

  return { config, isVisible, toggle };
}
