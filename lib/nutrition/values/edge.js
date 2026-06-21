/**
 * lib/nutrition/values/edge.js — nutrition_edge_master CRUD
 */
import { getAll, hasStore } from '@/lib/db';
import { byDisplayOrder, cleanKey, upsertWithTimestamp, upsertUniqueByIndex } from './shared';

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
  const edgeCode = cleanKey(data?.edgeCode);
  if (!edgeCode) return upsertWithTimestamp('nutrition_edge_master', data);
  return upsertUniqueByIndex('nutrition_edge_master', 'edgeCode', edgeCode, {
    ...data,
    edgeCode,
  });
}
