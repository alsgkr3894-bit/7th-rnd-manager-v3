import { NAV_SECTIONS } from '@/lib/menu';

const KNOWN_GROUP_IDS = new Set(
  NAV_SECTIONS.flatMap(section => section.groups.map(group => group.id))
);

function hrefCandidates(group) {
  const list = [];
  if (group.href) list.push(group.href);
  for (const child of group.children || []) {
    if (child.href) list.push(child.href);
  }
  return list;
}

/** 정확 일치는 2점, prefix 일치("href/"로 시작)는 1점 — 정확 일치가 항상 우선. */
function matchScore(href, pathname) {
  if (pathname === href) return { rank: 2, len: href.length };
  if (pathname.startsWith(href + '/')) return { rank: 1, len: href.length };
  return null;
}

/**
 * 현재 pathname에 해당하는 활성 네비게이션 그룹 id를 찾는다.
 *
 * 자식 href의 prefix 매칭만 쓰면(예: "/note") "/note/journal" 같은 다른 그룹의
 * 경로까지 걸려서 잘못된 그룹이 활성화된다 — 정확 일치를 최우선으로, 그다음
 * 가장 긴 prefix 일치를 고른다.
 *
 * @param {Array} sections - NAV_SECTIONS (또는 role로 필터링된 것)
 * @param {string} pathname
 * @returns {string|null} 활성 group id, 없으면 null
 */
export function findActiveNavGroupId(sections, pathname) {
  let best = null;
  for (const section of sections || []) {
    for (const group of section.groups || []) {
      for (const href of hrefCandidates(group)) {
        const score = matchScore(href, pathname);
        if (!score) continue;
        if (!best || score.rank > best.rank || (score.rank === best.rank && score.len > best.len)) {
          best = { groupId: group.id, rank: score.rank, len: score.len };
        }
      }
    }
  }
  return best ? best.groupId : null;
}

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
