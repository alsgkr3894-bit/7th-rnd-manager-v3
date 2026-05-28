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

/** 저장된 보고서 전체 조회 (생성일 내림차순) */
export async function getReports() {
  await initDB();
  const rows = await getAll('generated_reports');
  return rows.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

/**
 * 보고서 저장 (신규 생성 or 업데이트).
 * id 없으면 자동 증가.
 * @param {{ kind, name, period, author?, pages?, options?, fav? }} data
 */
export async function saveReport(data) {
  await initDB();
  const record = {
    fav: false,
    views: 0,
    links: 0,
    author: getProfile().name,
    pages: 1,
    options: {},
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
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
