/**
 * lib/work-log.js — 작업 자동 일지
 *
 * 다른 탭에서 저장/등록 작업 시 자동으로 오늘 날짜에 기록됨.
 * 달력에서 "자동 일지"로 표시.
 *
 * store: work_log
 * 필드: id, date (YYYY-MM-DD), at (ISO), type, summary, ref (nullable)
 */
import {
  initSharedDB,
  sharedRunTransaction as runTransaction,
  sharedGetAll as getAll,
  sharedHasStore as hasStore,
} from '@/lib/db/shared';
import { addLocalDays, formatLocalDateInput } from '@/lib/date/local-date';
import { getActiveBrandId } from '@/lib/active-brand';
import { assertActiveAdmin } from '@/lib/auth/guard';
import { SAMPLE_RECORD_LABEL } from '@/lib/sample/constants';

const STORE = 'work_log';

export const WORK_LOG_RETENTION_DAYS = 60;

export const WORK_LOG_TYPES = {
  NOTE_CREATE: { label: '노트 작성', color: '#3B82F6', icon: '📝' },
  NOTE_UPDATE: { label: '노트 수정', color: '#6366F1', icon: '✏️' },
  RECIPE_SAVE: { label: '레시피 저장', color: '#10B981', icon: '🍕' },
  ORIGIN_SAVE: { label: '원산지 등록', color: '#F59E0B', icon: '🗺️' },
  INGREDIENT_SAVE: { label: '식자재 등록', color: '#8B5CF6', icon: '🧂' },
  SAMPLE_SAVE: { label: SAMPLE_RECORD_LABEL, color: '#EC4899', icon: '🧪' },
  UPLOAD: { label: '파일 업로드', color: '#14B8A6', icon: '📤' },
  // ── 삭제·초기화·데이터 관리 이벤트 ──
  DELETE: { label: '삭제', color: '#EF4444', icon: '🗑️' },
  RESET: { label: '초기화', color: '#DC2626', icon: '♻️' },
  BACKUP: { label: '백업', color: '#0EA5E9', icon: '💾' },
  RESTORE: { label: '복원', color: '#F97316', icon: '↩️' },
  SECURITY: { label: '보안 설정', color: '#64748B', icon: '🔒' },
  OTHER: { label: '기타 작업', color: '#9CA3AF', icon: '⚙️' },
};

function todayStr() {
  return formatLocalDateInput();
}

function activeBrandId() {
  return getActiveBrandId() || 'main';
}

function normalizeRetentionDays(value, fallback = WORK_LOG_RETENTION_DAYS) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function brandOf(row) {
  return ((row?.brand || 'main') + '').trim() || 'main';
}

function belongsToActiveBrand(row) {
  return brandOf(row) === activeBrandId();
}

/**
 * 작업 일지 기록
 * @param {keyof WORK_LOG_TYPES} type
 * @param {string} summary  - 표시될 짧은 설명 (예: '슈퍼콤비네이션 피자')
 * @param {object} [opts]   - { ref: number|string }
 */
export async function logWork(type, summary, opts = {}) {
  // logWork는 fire-and-forget(await 없이)로도 호출되므로 initSharedDB 실패가
  // 처리되지 않은 rejection이 되지 않도록 전체를 try로 감싼다.
  try {
    await initSharedDB(); // 비-main 직접 진입 시 main 공유 DB 보장
    if (!hasStore(STORE)) return; // DB 초기화 전 호출 시 조용히 무시
    const now = new Date().toISOString();
    await runTransaction([STORE], 'readwrite', tx => {
      tx.objectStore(STORE).add({
        brand: opts.brand || activeBrandId(),
        date: todayStr(),
        at: now,
        type,
        summary: (summary || '').slice(0, 80),
        ref: opts.ref ?? null,
      });
    });
  } catch {
    /* 일지 실패는 메인 작업에 영향 없음 */
  }
}

export async function getWorkLogByDate(date) {
  await initSharedDB();
  if (!hasStore(STORE)) return [];
  const all = await getAll(STORE);
  return all
    .filter(r => r.date === date && belongsToActiveBrand(r))
    .sort((a, b) => a.at.localeCompare(b.at));
}

export async function getAllWorkLogs() {
  await initSharedDB();
  if (!hasStore(STORE)) return [];
  return (await getAll(STORE)).filter(belongsToActiveBrand);
}

/**
 * keepDays 기준 cutoff 날짜(YYYY-MM-DD)를 반환 — 순수 함수(테스트용).
 * @param {number} keepDays
 * @param {Date} [now]
 */
export function workLogCutoffDate(keepDays, now = new Date()) {
  return formatLocalDateInput(addLocalDays(now, -normalizeRetentionDays(keepDays)));
}

/**
 * cutoff 이전(미만) 로그만 골라낸다 — 순수 함수(테스트용).
 * @param {{date:string}[]} all
 * @param {string} cutStr  - YYYY-MM-DD
 */
export function filterOldWorkLogs(all, cutStr) {
  return (all || []).filter(r => r.date < cutStr);
}

/** WORK_LOG_RETENTION_DAYS 이전 로그 자동 정리 (용량 절약) */
export async function pruneOldWorkLogs(keepDays = WORK_LOG_RETENTION_DAYS) {
  await assertActiveAdmin('작업일지 보존기간 정리');
  await initSharedDB();
  if (!hasStore(STORE)) return;
  const cutStr = workLogCutoffDate(keepDays);
  const all = await getAll(STORE);
  const old = filterOldWorkLogs(all, cutStr);
  if (!old.length) return;
  await runTransaction([STORE], 'readwrite', tx => {
    const st = tx.objectStore(STORE);
    for (const r of old) st.delete(r.id);
  });
}
