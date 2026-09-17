import { describe, expect, test } from '@jest/globals';
import {
  DEFAULT_RESULT_LIMIT,
  PALETTE_GROUPS,
  buildFavoriteHrefSet,
  buildPaletteNavItems,
  filterPaletteItems,
  groupPaletteItems,
  isSearchingQuery,
  mapWorkLogs,
  normalizeQuery,
  sanitizePaletteItems,
  workLogHref,
} from '../../components/command-palette/paletteUtils.js';

describe('workLogHref', () => {
  test('노트/샘플은 ref 유무에 따라 상세·목록으로 간다', () => {
    expect(workLogHref({ type: 'NOTE_SAVE', ref: 'n1' })).toBe('/note/n1');
    expect(workLogHref({ type: 'NOTE_SAVE' })).toBe('/note');
    expect(workLogHref({ type: 'SAMPLE_SAVE', ref: 's1' })).toBe('/note/sample/s1');
    expect(workLogHref({ type: 'SAMPLE_SAVE' })).toBe('/note/sample');
  });

  test('고정 타입은 각 화면으로, 나머지는 달력으로 간다', () => {
    expect(workLogHref({ type: 'INGREDIENT_SAVE' })).toBe('/ingredient/manage');
    expect(workLogHref({ type: 'RECIPE_SAVE' })).toBe('/cost/recipe');
    expect(workLogHref({ type: 'ORIGIN_SAVE' })).toBe('/nutrition/origin');
    expect(workLogHref({ type: 'NUTRITION_SAVE' })).toBe('/nutrition/menu');
    expect(workLogHref({ type: 'BACKUP' })).toBe('/settings/backup');
    expect(workLogHref({ type: 'RESTORE' })).toBe('/settings/restore');
    expect(workLogHref({ type: 'UPLOAD' })).toBe('/menu-sales/upload');
    expect(workLogHref({ type: 'SECURITY' })).toBe('/settings/account');
    expect(workLogHref({ type: 'WHATEVER' })).toBe('/note/calendar');
    expect(workLogHref(null)).toBe('/note/calendar');
  });
});

describe('mapWorkLogs', () => {
  test('요약 없는 로그는 제외하고 최신순 5건만 work 항목으로 만든다', () => {
    const logs = [
      { type: 'NOTE_SAVE', ref: 'a', summary: '노트 A', at: '2026-01-01T00:00:00Z' },
      { type: 'BACKUP', summary: '', at: '2026-01-09T00:00:00Z' },
      { type: 'BACKUP', summary: '백업 1', at: '2026-01-02T00:00:00Z' },
      { type: 'BACKUP', summary: '백업 2', at: '2026-01-03T00:00:00Z' },
      { type: 'BACKUP', summary: '백업 3', at: '2026-01-04T00:00:00Z' },
      { type: 'BACKUP', summary: '백업 4', at: '2026-01-05T00:00:00Z' },
      { type: 'UNKNOWN', summary: '기타', at: '2026-01-06T00:00:00Z' },
      'broken',
    ];
    const types = { NOTE_SAVE: { label: '노트 저장' }, OTHER: { label: '기타 작업' } };
    const items = mapWorkLogs(logs, types);
    expect(items).toHaveLength(5);
    expect(items.map(item => item.sub)).toEqual(['기타', '백업 4', '백업 3', '백업 2', '백업 1']);
    expect(items[0]).toEqual({
      kind: 'work',
      label: '기타 작업',
      sub: '기타',
      href: '/note/calendar',
      at: '2026-01-06T00:00:00Z',
    });
    expect(items.every(item => item.kind === 'work')).toBe(true);
  });

  test('타입 메타가 없으면 "최근 작업" 라벨을 쓴다', () => {
    const [item] = mapWorkLogs([{ type: 'NOTE_SAVE', ref: 'n', summary: 'x', at: '1' }]);
    expect(item.label).toBe('최근 작업');
    expect(item.href).toBe('/note/n');
  });
});

describe('sanitizePaletteItems', () => {
  test('href/label 없는 항목과 객체가 아닌 값은 제거한다', () => {
    const items = [{ href: '/a', label: 'A' }, { href: '', label: 'B' }, { href: '/c' }, null, 'x'];
    expect(sanitizePaletteItems(items)).toEqual([{ href: '/a', label: 'A' }]);
    expect(sanitizePaletteItems(undefined)).toEqual([]);
  });

  test('가시성 검사 함수를 주면 그것까지 통과해야 남는다', () => {
    const items = [
      { href: '/a', label: 'A', requiresEdit: true },
      { href: '/b', label: 'B' },
    ];
    expect(sanitizePaletteItems(items, item => !item.requiresEdit)).toEqual([
      { href: '/b', label: 'B' },
    ]);
  });
});

describe('filterPaletteItems', () => {
  const all = Array.from({ length: 12 }, (_, i) => ({
    kind: 'menu',
    label: `메뉴 ${i}`,
    href: `/m/${i}`,
  }));

  test('검색어가 없으면 기본 항목 상위 9개만 돌려준다', () => {
    expect(isSearchingQuery('')).toBe(false);
    expect(isSearchingQuery('   ')).toBe(false);
    const result = filterPaletteItems([...all, { kind: 'work', label: 'w', href: '/w' }], all, '');
    expect(result).toHaveLength(DEFAULT_RESULT_LIMIT);
    expect(result[0].href).toBe('/m/0');
  });

  test('검색어는 대소문자·공백을 무시하고 label/sub 부분일치로 찾는다', () => {
    expect(normalizeQuery('  Pizza  Dough ')).toBe('pizzadough');
    const searchable = [
      { kind: 'menu', label: 'Pizza Dough', href: '/p' },
      { kind: 'ingredient', label: '치즈', sub: '토핑 · pizza', href: '/i' },
      { kind: 'note', label: '샐러드', href: '/n' },
    ];
    const result = filterPaletteItems(searchable, [], 'PIZ ZA');
    expect(result.map(item => item.href)).toEqual(['/p', '/i']);
    expect(isSearchingQuery('PIZ ZA')).toBe(true);
  });
});

describe('groupPaletteItems / buildPaletteNavItems', () => {
  const grouped = [
    { kind: 'nav', href: '/nav', label: 'nav' },
    { kind: 'sample', href: '/s', label: 's' },
    { kind: 'menu', href: '/m', label: 'm' },
    { kind: 'note', href: '/n', label: 'n' },
    { kind: 'unknown', href: '/u', label: 'u' },
  ];

  test('그룹 순서(PALETTE_GROUPS)대로 평탄화하고 미정의 kind는 제외한다', () => {
    expect(PALETTE_GROUPS.map(group => group.kind)).toEqual([
      'sample',
      'note',
      'ingredient',
      'menu',
      'action',
      'work',
      'nav',
    ]);
    expect(groupPaletteItems(grouped).map(item => item.kind)).toEqual([
      'sample',
      'note',
      'menu',
      'nav',
    ]);
  });

  test('검색 중이면 그룹 결과만, 아니면 즐겨찾기→최근 작업→최근 방문→그룹 순', () => {
    const favorites = [{ href: '/f', label: 'f' }];
    const workItems = [{ href: '/w', label: 'w' }];
    const recent = [{ href: '/r', label: 'r' }];
    const groupedList = groupPaletteItems(grouped);
    expect(
      buildPaletteNavItems({
        isSearching: true,
        favorites,
        workItems,
        recent,
        grouped: groupedList,
      })
    ).toEqual(groupedList);
    expect(
      buildPaletteNavItems({
        isSearching: false,
        favorites,
        workItems,
        recent,
        grouped: groupedList,
      }).map(item => item.href)
    ).toEqual(['/f', '/w', '/r', '/s', '/n', '/m', '/nav']);
  });

  test('즐겨찾기 href 집합을 만든다', () => {
    const set = buildFavoriteHrefSet([{ href: '/a' }, { href: '/b' }, null]);
    expect(set.has('/a')).toBe(true);
    expect(set.has('/c')).toBe(false);
  });
});
