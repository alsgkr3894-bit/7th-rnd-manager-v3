import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import { SAMPLE_RECORD_LABEL } from '@/lib/sample/constants';

/** 검색어 없을 때 기본 목록에 노출하는 최대 항목 수 */
export const DEFAULT_RESULT_LIMIT = 9;

/** 결과 그룹 — 렌더 순서이자 키보드 이동 순서 */
export const PALETTE_GROUPS = [
  { kind: 'sample', label: SAMPLE_RECORD_LABEL },
  { kind: 'note', label: '메뉴개발 노트' },
  { kind: 'ingredient', label: '식자재' },
  { kind: 'menu', label: '메뉴' },
  { kind: 'action', label: '빠른 작업' },
  { kind: 'work', label: '최근 작업' },
  { kind: 'nav', label: '자주 쓰는 이동' },
];

export const PALETTE_ICON_STYLE = {
  sample: { bg: 'var(--sample-ico-bg)', color: 'var(--sample-ico-color)' },
  note: { bg: 'var(--warn-soft)', color: 'var(--warn)' },
  ingredient: { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  menu: { bg: 'var(--accent-soft)', color: 'var(--accent-text)' },
  action: { bg: 'var(--note-ico-bg)', color: 'var(--note-ico-color)' },
  work: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
  nav: { bg: 'var(--accent-soft)', color: 'var(--accent-text)' },
};

export function workLogHref(log) {
  const type = asDisplayText(log?.type);
  const ref = asDisplayText(log?.ref);
  if (type.startsWith('NOTE')) return ref ? `/note/${ref}` : '/note';
  if (type.startsWith('SAMPLE')) return ref ? `/note/sample/${ref}` : '/note/sample';
  if (type === 'INGREDIENT_SAVE') return '/ingredient/manage';
  if (type === 'RECIPE_SAVE') return '/cost/recipe';
  if (type === 'ORIGIN_SAVE') return '/nutrition/origin';
  if (type === 'NUTRITION_SAVE') return '/nutrition/menu';
  if (type === 'BACKUP') return '/settings/backup';
  if (type === 'RESTORE') return '/settings/restore';
  if (type === 'UPLOAD') return '/menu-sales/upload';
  if (type === 'SECURITY') return '/settings/account';
  return '/note/calendar';
}

/** 작업 로그 → 팔레트 항목 (요약 있는 것만, 최신순 5건) */
export function mapWorkLogs(logs, types = {}) {
  return asObjectArray(logs)
    .filter(log => asDisplayText(log.summary))
    .sort((a, b) => asDisplayText(b.at).localeCompare(asDisplayText(a.at)))
    .slice(0, 5)
    .map(log => {
      const type = asDisplayText(log.type, 'OTHER');
      const typeMeta = types[type] || types.OTHER || {};
      const label = asDisplayText(typeMeta.label, '최근 작업');
      const summary = asDisplayText(log.summary);
      return {
        kind: 'work',
        label,
        sub: summary,
        href: workLogHref(log),
        at: asDisplayText(log.at),
      };
    });
}

/**
 * href/label 없는 항목 제거. `isVisible`을 주면 역할 가시성까지 검사한다.
 * @param {unknown} items
 * @param {(item: object) => boolean} [isVisible]
 */
export function sanitizePaletteItems(items, isVisible) {
  return asObjectArray(items).filter(
    item => asDisplayText(item.href) && asDisplayText(item.label) && (!isVisible || isVisible(item))
  );
}

/** 검색 비교용 정규화 — 소문자 + 공백 제거 */
export function normalizeQuery(value) {
  return asDisplayText(value).toLowerCase().replace(/\s+/g, '');
}

export function isSearchingQuery(query) {
  return asDisplayText(query).trim().length > 0;
}

/**
 * 검색 중이면 label/sub 부분일치, 아니면 기본 항목 상위 N개.
 * @param {object[]} searchableItems 검색 대상(기본 항목 + 최근 작업)
 * @param {object[]} defaultItems 검색어 없을 때 보여줄 기본 항목
 * @param {string} query
 */
export function filterPaletteItems(searchableItems, defaultItems, query) {
  if (!isSearchingQuery(query)) return asObjectArray(defaultItems).slice(0, DEFAULT_RESULT_LIMIT);
  const needle = normalizeQuery(query);
  return asObjectArray(searchableItems).filter(
    x =>
      normalizeQuery(x.label).includes(needle) || (x.sub && normalizeQuery(x.sub).includes(needle))
  );
}

/** 그룹(PALETTE_GROUPS) 순서로 평탄화 — 실제 렌더 순서와 동일 */
export function groupPaletteItems(items) {
  const list = asObjectArray(items);
  return PALETTE_GROUPS.flatMap(({ kind }) => list.filter(x => x.kind === kind));
}

/**
 * 키보드 네비게이션 대상 목록.
 * 그룹 결과는 GROUPS 순서로 재정렬되므로 filtered 배열 순서와 다르다 →
 * activeIdx/Enter가 강조 항목과 어긋나지 않도록 렌더 순서와 같게 맞춘다.
 */
export function buildPaletteNavItems({ isSearching, favorites, workItems, recent, grouped }) {
  const groupedList = asObjectArray(grouped);
  if (isSearching) return groupedList;
  return [
    ...asObjectArray(favorites),
    ...asObjectArray(workItems),
    ...asObjectArray(recent),
    ...groupedList,
  ];
}

export function buildFavoriteHrefSet(favorites) {
  return new Set(asObjectArray(favorites).map(item => asDisplayText(item.href)));
}
