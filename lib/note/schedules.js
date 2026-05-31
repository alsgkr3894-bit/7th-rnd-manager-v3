/**
 * lib/note/schedules.js — 달력 일정 CRUD
 *
 * store: note_schedules
 * 필드: id, title, date (YYYY-MM-DD), time (HH:MM | ''),
 *       type, description, linkedNoteId, createdAt, updatedAt
 */
import { getAll, runTransaction, deleteById, hasStore } from '@/lib/db';

const STORE = 'note_schedules';

export const SCHEDULE_TYPES = [
  '테스트 예정',
  '미팅',
  '보고',
  '원재료 개발',
  '납품 일정',
  '기타',
];

export const SCHEDULE_COLORS = {
  '테스트 예정': { bg: '#DBEAFE', text: '#1D4ED8', border: '#3B82F6' },
  '미팅':        { bg: '#F3E8FF', text: '#7C3AED', border: '#8B5CF6' },
  '보고':        { bg: '#FEF3C7', text: '#B45309', border: '#F59E0B' },
  '원재료 개발': { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
  '납품 일정':   { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  '기타':        { bg: 'var(--surface-2)', text: 'var(--text-2)', border: 'var(--border-strong)' },
};

function build(data) {
  return {
    title:        (data.title || '').trim(),
    date:         (data.date  || '').trim(),
    time:         (data.time  || '').trim(),
    type:         data.type || '기타',
    description:  (data.description || '').trim(),
    linkedNoteId: data.linkedNoteId ?? null,
    // 반복 일정: repeatType은 반복 주기, repeatUntil은 반복 종료 날짜 (ISO 문자열 or null)
    repeatType:   data.repeatType  ?? 'none', // 'none' | 'daily' | 'weekly' | 'monthly'
    repeatUntil:  data.repeatUntil ?? null,   // ISO date string or null
    updatedAt:    new Date().toISOString(),
  };
}

export async function getAllSchedules() {
  if (!hasStore(STORE)) return [];
  return getAll(STORE);
}

export async function addSchedule(data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const now = new Date().toISOString();
  let insertedId = null;
  await runTransaction([STORE], 'readwrite', tx => {
    const req = tx.objectStore(STORE).add({ ...build(data), createdAt: now });
    req.onsuccess = () => { insertedId = req.result; };
  });
  return insertedId;
}

export async function updateSchedule(id, data) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  const all = await getAll(STORE);
  const existing = all.find(r => r.id === id);
  if (!existing) throw new Error('일정을 찾을 수 없습니다');
  await runTransaction([STORE], 'readwrite', tx => {
    tx.objectStore(STORE).put({ ...existing, ...build(data), id });
  });
}

export async function deleteSchedule(id) {
  if (!hasStore(STORE)) throw new Error(`${STORE} store 없음`);
  return deleteById(STORE, id);
}
