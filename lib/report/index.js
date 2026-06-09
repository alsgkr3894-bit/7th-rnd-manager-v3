/**
 * lib/report/index.js — 생성된 보고서 CRUD
 *
 * generated_reports store 스키마:
 * { id (autoIncrement), kind, name, period, author, pages,
 *   options (JSON), fav, views, links, createdAt (ISO string) }
 */

import { initDB } from '@/lib/db/init';
import { getAll, put, deleteById } from '@/lib/db/operations';
import { getProfile } from '@/lib/profile';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

const DEFAULT_KEEP_DAYS = 90;

function asPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeKeepDays(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_KEEP_DAYS;
}

/** 저장된 보고서 전체 조회 (생성일 내림차순) */
export async function getReports() {
  await initDB();
  const rows = await getAll('generated_reports');
  return asObjectArray(rows).sort((a, b) =>
    asDisplayText(b.createdAt).localeCompare(asDisplayText(a.createdAt))
  );
}

/**
 * 보고서 저장 (신규 생성 or 업데이트).
 * id 없으면 자동 증가.
 * @param {{ kind, name, period, author?, pages?, options?, fav? }} data
 */
export async function saveReport(data) {
  await initDB();
  const safeData = asPlainObject(data);
  const profile = asPlainObject(getProfile());
  const record = {
    fav: false,
    views: 0,
    links: 0,
    author: asDisplayText(profile.name),
    pages: 1,
    options: {},
    ...safeData,
    createdAt: asDisplayText(safeData.createdAt) || new Date().toISOString(),
  };
  return put('generated_reports', record);
}

/** 즐겨찾기 토글 */
export async function toggleReportFav(id, currentFav) {
  await initDB();
  const rows = await getAll('generated_reports');
  const target = rows.find(r => r.id === id);
  if (!target) return;
  return put('generated_reports', { ...target, fav: !currentFav });
}

/** 보고서 삭제 */
export async function deleteReport(id) {
  await initDB();
  return deleteById('generated_reports', id);
}

/**
 * 오래된 보고서 자동 정리
 * @param {number} keepDays - 보관 기간 (기본 90일)
 */
export async function pruneOldReports(keepDays = 90) {
  await initDB();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - normalizeKeepDays(keepDays));
  const cutoffISO = cutoff.toISOString();
  const rows = asObjectArray(await getAll('generated_reports'));
  const old = rows.filter(r => r.createdAt < cutoffISO);
  for (const r of old) await deleteById('generated_reports', r.id);
}
