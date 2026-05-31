/**
 * lib/cost/margin/platforms.js
 * 플랫폼 설정 데이터 + localStorage 영속성
 *
 * 순수 계산 함수(applyDiscount, calcNetRevenue, calcPlatformMargin)는
 * lib/cost/margin/calc.js 에 분리돼 있습니다.
 *
 * fee 구조:
 *   { id, label, type: 'pct',   value: 7.5 }
 *   { id, label, type: 'fixed', value: 3000,
 *     sizeOverrides?: { L?: 3500, R?: 2500 } }
 */

import { KEYS } from '@/lib/note/keys';

export const DEFAULT_PLATFORMS = [
  {
    id: 'default',
    name: '기본',
    fees: [],
  },
  {
    id: 'visit',
    name: '방문/포장',
    fees: [
      { id: 'f1', label: '할인', type: 'fixed', value: 7000 },
    ],
  },
  {
    id: 'baemin',
    name: '배달의민족',
    fees: [
      { id: 'f1', label: '플랫폼수수료', type: 'pct',   value: 7.5 },
      { id: 'f2', label: '배달비',       type: 'fixed', value: 3000 },
      { id: 'f3', label: '카드수수료',   type: 'pct',   value: 2.5 },
    ],
  },
];

// TODO: 향후 IndexedDB cost_platforms 스토어로 이전 예정 (백업 포함)
// 현재는 localStorage 사용 (빠른 읽기, 단일 브라우저 환경)
export function loadPlatforms() {
  if (typeof localStorage === 'undefined') return DEFAULT_PLATFORMS;
  try {
    const raw = localStorage.getItem(KEYS.COST_PLATFORMS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_PLATFORMS;
}

export function savePlatforms(platforms) {
  try {
    localStorage.setItem(KEYS.COST_PLATFORMS, JSON.stringify(platforms));
  } catch {}
}

// 순수 계산 함수 — calc.js에서 re-export (하위 호환)
export { applyDiscount, calcNetRevenue, calcPlatformMargin } from './calc';
