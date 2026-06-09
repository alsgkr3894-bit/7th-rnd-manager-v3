import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  getRecentPaletteItems,
  normalizeRecentItems,
  saveRecentPaletteItem,
} from '../../lib/palette-recent.js';

const RECENT_KEY = 'v3:palette-recent';
let storageData;

beforeEach(() => {
  storageData = {};
  globalThis.localStorage = {
    getItem: key => (key in storageData ? storageData[key] : null),
    setItem: (key, value) => {
      storageData[key] = String(value);
    },
    removeItem: key => {
      delete storageData[key];
    },
  };
});

describe('palette recent items', () => {
  test('깨진 최근 방문 항목은 제외하고 정상 항목만 유지한다', () => {
    expect(
      normalizeRecentItems([
        { href: '/report', label: '보고서', kind: 'nav' },
        null,
        { href: '', label: '빈 링크' },
        { href: '/cost', label: '원가' },
        { href: '/note', label: '노트', kind: 10 },
        { href: '/settings', label: '설정', kind: '  ' },
        { href: '/report', label: '중복 보고서', kind: ' menu ' },
      ])
    ).toEqual([
      { href: '/report', label: '보고서', kind: 'nav' },
      { href: '/cost', label: '원가', kind: 'nav' },
      { href: '/note', label: '노트', kind: 'nav' },
      { href: '/settings', label: '설정', kind: 'nav' },
      { href: '/report', label: '중복 보고서', kind: 'menu' },
    ]);
  });

  test('localStorage 값이 배열이 아니면 빈 목록으로 읽는다', () => {
    storageData[RECENT_KEY] = JSON.stringify({ href: '/broken', label: '깨짐' });

    expect(getRecentPaletteItems()).toEqual([]);
  });

  test('저장 시 중복 href는 최신 항목 하나만 남긴다', () => {
    storageData[RECENT_KEY] = JSON.stringify([
      { href: '/report', label: '보고서', kind: 'nav' },
      { href: '/cost', label: '원가', kind: 'nav' },
    ]);

    const result = saveRecentPaletteItem({ href: '/cost', label: '원가 계산', kind: 'menu' });

    expect(result).toEqual([
      { href: '/cost', label: '원가 계산', kind: 'menu' },
      { href: '/report', label: '보고서', kind: 'nav' },
    ]);
    expect(JSON.parse(storageData[RECENT_KEY])).toEqual(result);
  });
});
