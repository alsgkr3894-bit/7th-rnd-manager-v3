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
import { put, getById, hasStore } from '@/lib/db';

const DB_STORE = 'cost_platform_fees';
const DB_KEY   = 'config';

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

function normalizeFee(fee) {
  if (!fee || typeof fee !== 'object' || Array.isArray(fee)) return null;
  const id = typeof fee.id === 'string' && fee.id.trim() ? fee.id : null;
  const type = fee.type === 'pct' || fee.type === 'fixed' ? fee.type : null;
  if (!id || !type) return null;

  return {
    ...fee,
    id,
    label: typeof fee.label === 'string' ? fee.label : '항목',
    type,
    value: Number.isFinite(Number(fee.value)) ? Number(fee.value) : 0,
    ...(type === 'fixed' && fee.sizeOverrides && typeof fee.sizeOverrides === 'object' && !Array.isArray(fee.sizeOverrides)
      ? { sizeOverrides: fee.sizeOverrides }
      : {}),
  };
}

function normalizePlatform(platform) {
  if (!platform || typeof platform !== 'object' || Array.isArray(platform)) return null;
  const id = typeof platform.id === 'string' && platform.id.trim() ? platform.id : null;
  if (!id) return null;

  return {
    ...platform,
    id,
    name: typeof platform.name === 'string' && platform.name.trim() ? platform.name : '플랫폼',
    fees: Array.isArray(platform.fees) ? platform.fees.map(normalizeFee).filter(Boolean) : [],
  };
}

export function normalizePlatforms(platforms) {
  if (!Array.isArray(platforms)) return null;
  const normalized = platforms.map(normalizePlatform).filter(Boolean);
  return normalized.length > 0 ? normalized : null;
}

// localStorage が live source of truth（同期読み取り保証）。
// IndexedDB cost_platform_fees はミラー：バックアップ/リストアで使用される。
// 新しいブラウザ起動時に hydratePlatformsFromDB() が localStorage を復元する。
export function loadPlatforms() {
  if (typeof localStorage === 'undefined') return DEFAULT_PLATFORMS;
  try {
    const raw = localStorage.getItem(KEYS.COST_PLATFORMS);
    if (raw) return normalizePlatforms(JSON.parse(raw)) || DEFAULT_PLATFORMS;
  } catch {}
  return DEFAULT_PLATFORMS;
}

export function savePlatforms(platforms) {
  const safePlatforms = normalizePlatforms(platforms) || DEFAULT_PLATFORMS;
  try {
    localStorage.setItem(KEYS.COST_PLATFORMS, JSON.stringify(safePlatforms));
  } catch {}
  // IndexedDB 미러: 백업/복원 경로에 포함되도록 best-effort 비동기 기록
  (async () => {
    try {
      if (typeof indexedDB === 'undefined') return;
      if (!(await hasStore(DB_STORE))) return;
      await put(DB_STORE, { id: DB_KEY, platforms: safePlatforms, updatedAt: new Date().toISOString() });
    } catch {
      // 무시 — DB 미초기화 시에도 안전
    }
  })();
}

/**
 * 새 브라우저/기기에서 importAll 복원 후 localStorage가 비어있을 때
 * IndexedDB cost_platform_fees 의 config 레코드를 localStorage로 복원한다.
 * localStorage에 이미 값이 있으면 아무것도 하지 않는다 (localStorage 우선).
 */
export async function hydratePlatformsFromDB() {
  try {
    if (typeof localStorage === 'undefined') return;
    if (typeof indexedDB === 'undefined') return;
    // localStorage에 이미 값이 있으면 그것이 우선
    if (localStorage.getItem(KEYS.COST_PLATFORMS) !== null) return;
    if (!(await hasStore(DB_STORE))) return;
    const record = await getById(DB_STORE, DB_KEY);
    const platforms = normalizePlatforms(record?.platforms);
    if (platforms) {
      localStorage.setItem(KEYS.COST_PLATFORMS, JSON.stringify(platforms));
    }
  } catch {
    // 무시 — DB 부재 또는 파싱 오류 시 안전하게 종료
  }
}

// 순수 계산 함수 — calc.js에서 re-export (하위 호환)
export { applyDiscount, calcNetRevenue, calcPlatformMargin } from './calc';
