/**
 * lib/nutrition/values/edge.js — nutrition_edge_master CRUD
 */
import { getAll, hasStore } from '@/lib/db';
import { assertActiveAdmin } from '@/lib/auth/guard';
import { byDisplayOrder, cleanKey, upsertWithTimestamp, upsertUniqueByIndex } from './shared';
import { NUTRITION_FIELDS } from './calc';

// 계산 로직(label/sheets/pizza.js)은 중량을 제외한 모든 항목을 "100g 기준"으로 요구한다.
// 실무에서는 "이 크러스트에 실제로 들어가는 중량 전체의 총 영양성분"을 입력하는 편이
// 더 자연스러우므로, 그렇게 입력한 값을 100g 기준으로 환산해주는 헬퍼를 제공한다.
const EDGE_VALUE_KEYS = NUTRITION_FIELDS.filter(f => f.key !== 'weight').map(f => f.key);

/** 중량 전체 기준 총량 값 → 100g 기준 값으로 환산. 중량 미입력/0 이하면 null. */
export function convertEdgeTotalToPer100g(values) {
  const weight = parseFloat(values?.weight);
  if (!(weight > 0)) return null;
  const factor = weight / 100;
  const next = { ...values };
  EDGE_VALUE_KEYS.forEach(key => {
    const raw = values?.[key];
    if (raw === '' || raw == null) return;
    const num = parseFloat(raw);
    if (!Number.isFinite(num)) return;
    next[key] = Math.round((num / factor) * 100) / 100;
  });
  return next;
}

export async function getAllEdges() {
  if (!hasStore('nutrition_edge_master')) return [];
  const rows = await getAll('nutrition_edge_master');
  return rows.sort(byDisplayOrder);
}

export async function getEdgeMap() {
  const rows = await getAllEdges();
  const map = {};
  rows.forEach(r => {
    map[r.edgeCode] = r;
  });
  return map;
}

export async function upsertEdge(data) {
  await assertActiveAdmin('영양 엣지 기준 저장');
  const edgeCode = cleanKey(data?.edgeCode);
  if (!edgeCode) return upsertWithTimestamp('nutrition_edge_master', data);
  return upsertUniqueByIndex('nutrition_edge_master', 'edgeCode', edgeCode, {
    ...data,
    edgeCode,
  });
}
