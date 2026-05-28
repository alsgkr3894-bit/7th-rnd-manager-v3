/**
 * lib/nutrition/origin/store.js — nutrition_origin_master CRUD
 *
 * 레코드 구조:
 *   id            autoIncrement PK
 *   ingredientCode  string (선택 — 원가 식재료와 연결 시)
 *   ingredientName  string (표시명)
 *   originCountry   string (국가명, e.g. '미국', '국내산')
 *   originRegion    string (지역/세부, e.g. '캘리포니아')
 *   category        string ('주재료'|'부재료'|'소스'|'도우/크러스트'|'기타')
 *   note            string
 *   displayOrder    number
 *   updatedAt       ISO string
 */

import { getAll, put, deleteById, runTransaction, hasStore } from '@/lib/db';

const STORE = 'nutrition_origin_master';

export async function getAllOrigins() {
  if (!hasStore(STORE)) return [];
  const rows = await getAll(STORE);
  return rows.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999) || (a.ingredientName || '').localeCompare(b.ingredientName || ''));
}

export async function upsertOrigin(data) {
  const now = new Date().toISOString();
  const record = { ...data, updatedAt: now };
  return await put(STORE, record);
}

export async function deleteOrigin(id) {
  return await deleteById(STORE, id);
}

export async function bulkUpsertOrigins(items) {
  const now = new Date().toISOString();
  return await runTransaction(STORE, 'readwrite', (tx) => {
    const s = tx.objectStore(STORE);
    items.forEach(item => s.put({ ...item, updatedAt: now }));
  });
}

/** 카테고리 목록 */
export const ORIGIN_CATEGORIES = ['주재료', '부재료', '소스', '도우/크러스트', '기타'];
