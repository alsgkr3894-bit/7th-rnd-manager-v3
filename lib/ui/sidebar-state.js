import { NAV_SECTIONS } from '@/lib/menu';

const KNOWN_GROUP_IDS = new Set(
  NAV_SECTIONS.flatMap(section => section.groups.map(group => group.id))
);

export function normalizeSidebarOpenIds(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const normalized = {};
  let openId = null;
  for (const [id, isOpen] of Object.entries(value)) {
    if (!KNOWN_GROUP_IDS.has(id) || typeof isOpen !== 'boolean') continue;
    // 아코디언 — 이전 저장값에 여러 그룹이 열려 있었더라도 하나만 남긴다.
    if (isOpen) {
      if (openId != null) continue;
      openId = id;
    }
    normalized[id] = isOpen;
  }
  return normalized;
}
