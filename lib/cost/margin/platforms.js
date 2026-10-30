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
import { assertActiveAdmin } from '@/lib/auth/guard';

const DB_STORE = 'cost_platform_fees';
const DB_KEY = 'config';

export const DEFAULT_PLATFORMS = [
  {
    id: 'default',
    name: '기본',
    fees: [],
  },
  {
    id: 'visit',
    name: '방문/포장',
    fees: [{ id: 'f1', label: '할인', type: 'fixed', value: 7000 }],
  },
  {
    id: 'baemin',
    name: '배달의민족',
    fees: [
      { id: 'f1', label: '플랫폼수수료', type: 'pct', value: 7.5 },
      { id: 'f2', label: '배달비', type: 'fixed', value: 3000 },
      { id: 'f3', label: '카드수수료', type: 'pct', value: 2.5 },
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
    ...(type === 'fixed' &&
    fee.sizeOverrides &&
    typeof fee.sizeOverrides === 'object' &&
    !Array.isArray(fee.sizeOverrides)
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

// localStorage는 화면이 동기로 읽는 사본이고, IndexedDB cost_platform_fees(서버와 동기화됨)는 PC 사이에
// 공유되는 원본이다. 두 곳에 저장 시각을 같이 남겨, 더 최근 것이 이긴다.
//
// 2026-10-30: 전에는 localStorage에 값이 있으면 IndexedDB(서버)에 더 최신 값이 와도 무시해서, 다른 PC에서
// 수수료를 고쳐도 이 PC는 옛 값(또는 기본값 배민 7.5% + 3,000원 + 2.5%)으로 마진을 계산했다.
const UPDATED_AT_KEY = `${KEYS.COST_PLATFORMS}:updated-at`;
export const PLATFORMS_UPDATED_EVENT = 'cost-platforms:updated';

function timeOf(value) {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

export function loadPlatforms() {
  if (typeof localStorage === 'undefined') return DEFAULT_PLATFORMS;
  try {
    const raw = localStorage.getItem(KEYS.COST_PLATFORMS);
    if (raw) return normalizePlatforms(JSON.parse(raw)) || DEFAULT_PLATFORMS;
  } catch {}
  return DEFAULT_PLATFORMS;
}

export async function savePlatforms(platforms) {
  await assertActiveAdmin('마진 플랫폼 수수료 설정 저장');
  const safePlatforms = normalizePlatforms(platforms) || DEFAULT_PLATFORMS;
  const updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(KEYS.COST_PLATFORMS, JSON.stringify(safePlatforms));
    localStorage.setItem(UPDATED_AT_KEY, updatedAt);
  } catch {}
  // IndexedDB 미러: 서버 동기화·백업/복원 경로에 포함되도록 best-effort 비동기 기록
  try {
    if (typeof indexedDB === 'undefined') return;
    if (!(await hasStore(DB_STORE))) return;
    await put(DB_STORE, { id: DB_KEY, platforms: safePlatforms, updatedAt });
  } catch {
    // 무시 — DB 미초기화 시에도 안전
  }
}

/**
 * IndexedDB cost_platform_fees 의 config 레코드가 이 브라우저의 localStorage 값보다 최근이면 localStorage를
 * 그 값으로 바꾼다(다른 PC에서 고친 수수료, 서버에서 불러온 값, 백업 복원). 저장 시각이 없는 옛 localStorage
 * 값은 가장 오래된 것으로 본다. 값을 바꿨으면 true(화면은 PLATFORMS_UPDATED_EVENT로 다시 읽는다).
 */
export async function hydratePlatformsFromDB() {
  try {
    if (typeof localStorage === 'undefined') return false;
    if (typeof indexedDB === 'undefined') return false;
    if (!(await hasStore(DB_STORE))) return false;
    const record = await getById(DB_STORE, DB_KEY);
    const platforms = normalizePlatforms(record?.platforms);
    if (!platforms) return false;

    const recordAt = timeOf(record.updatedAt);
    const hasLocal = localStorage.getItem(KEYS.COST_PLATFORMS) !== null;
    const localAt = timeOf(localStorage.getItem(UPDATED_AT_KEY));
    // 이 브라우저 값이 같거나 더 최근이면 그대로 둔다
    if (hasLocal && recordAt <= localAt) return false;

    const sameAsLocal = hasLocal && JSON.stringify(platforms) === JSON.stringify(loadPlatforms());
    localStorage.setItem(KEYS.COST_PLATFORMS, JSON.stringify(platforms));
    if (record.updatedAt) localStorage.setItem(UPDATED_AT_KEY, record.updatedAt);
    // 내용이 같으면 저장 시각만 맞추고 화면은 다시 그리지 않는다
    if (sameAsLocal) return false;
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(PLATFORMS_UPDATED_EVENT));
    }
    return true;
  } catch {
    // 무시 — DB 부재 또는 파싱 오류 시 안전하게 종료
  }
}

// 순수 계산 함수 — calc.js에서 re-export (하위 호환)
export { applyDiscount, calcNetRevenue, calcPlatformMargin, fixedFeeDisplayAmounts } from './calc';
