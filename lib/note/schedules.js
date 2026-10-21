/**
 * lib/note/schedules.js — 달력 일정 CRUD
 *
 * store: note_schedules
 * 필드: id, title, date/endDate (YYYY-MM-DD), time (HH:MM | ''),
 *       type, description, linkedNoteId, createdAt, updatedAt
 */
import {
  initSharedDB,
  sharedGetAll as getAll,
  sharedRunTransaction as runTransaction,
  sharedDeleteById as deleteById,
  sharedHasStore as hasStore,
} from '@/lib/db/shared';
import { getActiveBrandId } from '@/lib/active-brand';
import { assertActiveAdmin } from '@/lib/auth/guard';
import { isLeaveType, isValidDateKey } from '@/lib/note/annual-leave';

const STORE = 'note_schedules';

export const SCHEDULE_TYPES = [
  '테스트 예정',
  '미팅',
  '보고',
  '원재료 개발',
  '납품 일정',
  '연차',
  '반차',
  '행사',
  '프로젝트',
  '기타',
];

export const SCHEDULE_COLORS = {
  '테스트 예정': { bg: '#DBEAFE', text: '#1D4ED8', border: '#3B82F6' },
  미팅: { bg: '#F3E8FF', text: '#7C3AED', border: '#8B5CF6' },
  보고: { bg: '#FEF3C7', text: '#B45309', border: '#F59E0B' },
  '원재료 개발': { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
  '납품 일정': { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  연차: { bg: '#E0F2FE', text: '#0369A1', border: '#0EA5E9' },
  반차: { bg: '#E0F7FA', text: '#0E7490', border: '#22B8CF' },
  행사: { bg: '#FCE7F3', text: '#BE185D', border: '#EC4899' },
  프로젝트: { bg: '#EDE9FE', text: '#5B21B6', border: '#8B5CF6' },
  기타: { bg: 'var(--surface-2)', text: 'var(--text-2)', border: 'var(--border-strong)' },
};

function build(data) {
  const leaveType = isLeaveType(data.type);
  const endDate = data.endDate || data.date;
  const multiDay = endDate > data.date;
  return {
    brand: ((data.brand || getActiveBrandId() || 'main') + '').trim() || 'main',
    title: (data.title || '').trim(),
    date: (data.date || '').trim(),
    endDate: (endDate || '').trim(),
    time: (data.time || '').trim(),
    type: data.type || '기타',
    description: (data.description || '').trim(),
    linkedNoteId: data.linkedNoteId ?? null,
    // 반복 일정: repeatType은 반복 주기, repeatUntil은 반복 종료 날짜 (ISO 문자열 or null)
    repeatType: leaveType || multiDay ? 'none' : (data.repeatType ?? 'none'), // 'none' | 'daily' | 'weekly' | 'monthly'
    repeatUntil: leaveType || multiDay ? null : (data.repeatUntil ?? null), // ISO date string or null
    updatedAt: new Date().toISOString(),
  };
}

function validateRange(data) {
  if (!isValidDateKey(data.date) || !isValidDateKey(data.endDate || data.date)) {
    throw new Error('올바른 일정 날짜를 입력해주세요');
  }
  if (data.endDate && data.endDate < data.date) {
    throw new Error('종료일은 시작일보다 빠를 수 없습니다');
  }
}

function brandOf(row) {
  return ((row?.brand || 'main') + '').trim() || 'main';
}

function belongsToActiveBrand(row) {
  return brandOf(row) === (getActiveBrandId() || 'main');
}

export async function getAllSchedules() {
  await initSharedDB(); // 비-main 직접 진입 시 main 공유 DB 보장
  if (!hasStore(STORE)) return [];
  return (await getAll(STORE)).filter(belongsToActiveBrand);
}

export async function addSchedule(data) {
  await assertActiveAdmin('일정 추가');
  validateRange(data);
  await initSharedDB();
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const now = new Date().toISOString();
  let insertedId = null;
  await runTransaction([STORE], 'readwrite', tx => {
    const req = tx.objectStore(STORE).add({
      ...build(data),
      createdAt: now,
    });
    req.onsuccess = () => {
      insertedId = req.result;
    };
  });
  return insertedId;
}

export async function updateSchedule(id, data) {
  await assertActiveAdmin('일정 수정');
  await initSharedDB();
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const all = await getAll(STORE);
  const existing = all.find(r => r.id === id && belongsToActiveBrand(r));
  if (!existing) throw new Error('일정을 찾을 수 없습니다');
  const merged = { ...existing, ...data };
  validateRange(merged);
  await runTransaction([STORE], 'readwrite', tx => {
    tx.objectStore(STORE).put({
      ...existing,
      ...build(merged),
      id,
    });
  });
}

export async function deleteSchedule(id) {
  await assertActiveAdmin('일정 삭제');
  await initSharedDB();
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const all = await getAll(STORE);
  if (!all.some(r => r.id === id && belongsToActiveBrand(r))) {
    throw new Error('일정을 찾을 수 없습니다');
  }
  return deleteById(STORE, id);
}
