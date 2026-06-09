import { NAV_SECTIONS } from '@/lib/menu';

const KNOWN_GROUP_IDS = new Set(
  NAV_SECTIONS.flatMap(section => section.groups.map(group => group.id))
);

export function normalizeSidebarOpenIds(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const normalized = {};
  for (const [id, isOpen] of Object.entries(value)) {
    if (!KNOWN_GROUP_IDS.has(id) || typeof isOpen !== 'boolean') continue;
    normalized[id] = isOpen;
  }
  return normalized;
}
