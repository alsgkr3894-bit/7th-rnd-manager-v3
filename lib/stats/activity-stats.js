/**
 * lib/stats/activity-stats.js — 최근 활동 (upload_log + 노트 생성)
 *
 * upload_log 필드 가정: { id, fileHash, module, at, fileName, summary }
 * notes 필드:           { id, title, category, createdAt, status }
 */

import { safeAll } from './_helpers';

/**
 * 최근 활동 — upload_log + 노트를 시간 역순으로 결합
 * 반환 type:
 *   - 'upload-sales' | 'upload-jette' | 'upload' — 업로드 이벤트
 *   - 'note' — 노트 생성
 */
export async function getRecentActivities(limit = 8) {
  const [logs, notes] = await Promise.all([
    safeAll('upload_log'),
    safeAll('menu_dev_notes'),
  ]);

  const events = [];

  for (const log of logs) {
    if (!log.at) continue;
    events.push({
      type: log.module === 'menu-sales' ? 'upload-sales'
          : log.module === 'jette' ? 'upload-jette'
          : 'upload',
      when: log.at,
      title: log.fileName || `${log.module} 업로드`,
      sub: log.summary || '',
    });
  }

  for (const note of notes) {
    if (!note.createdAt) continue;
    events.push({
      type: 'note',
      when: note.createdAt,
      title: note.title || '메뉴개발노트',
      sub: note.category || '',
    });
  }

  return events
    .sort((a, b) => new Date(b.when) - new Date(a.when))
    .slice(0, limit);
}
