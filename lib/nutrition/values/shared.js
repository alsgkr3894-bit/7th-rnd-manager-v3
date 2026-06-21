/**
 * lib/nutrition/values/shared.js — values 모듈 내부 공용 헬퍼
 *
 * DB 접근이 있는 헬퍼. store.js에서 외부로 노출하지 않음.
 */
import { getByIndex, put, runTransaction } from '@/lib/db';
import { pickKeepRecord } from './dedup';

export const byDisplayOrder = (a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999);

export function cleanKey(value) {
  return String(value ?? '').trim();
}

export function upsertWithTimestamp(storeName, data) {
  return put(storeName, { ...data, updatedAt: new Date().toISOString() });
}

export async function upsertUniqueByIndex(storeName, indexName, indexValue, data) {
  const rows = await getByIndex(storeName, indexName, indexValue);
  if (!rows.length) return upsertWithTimestamp(storeName, data);

  const preferred = data?.id != null ? rows.find(row => Number(row.id) === Number(data.id)) : null;
  const keep = preferred || pickKeepRecord(rows);
  const timestamp = new Date().toISOString();
  const next = { ...keep, ...data, id: keep.id, updatedAt: timestamp };

  await runTransaction(storeName, 'readwrite', tx => {
    const st = tx.objectStore(storeName);
    st.put(next);
    for (const row of rows) {
      if (row.id != null && row.id !== keep.id) st.delete(row.id);
    }
  });
  return keep.id;
}
