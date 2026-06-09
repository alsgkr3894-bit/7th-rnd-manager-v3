import { describe, expect, test } from '@jest/globals';
import { normalizeSidebarOpenIds } from '../../lib/ui/sidebar-state.js';
import { NAV_SECTIONS } from '../../lib/menu.js';

const knownGroupId = NAV_SECTIONS[0].groups[0].id;

describe('normalizeSidebarOpenIds', () => {
  test('객체가 아니면 빈 상태로 복구한다', () => {
    expect(normalizeSidebarOpenIds(null)).toEqual({});
    expect(normalizeSidebarOpenIds(['bad'])).toEqual({});
  });

  test('알려진 그룹의 boolean 값만 보존한다', () => {
    expect(normalizeSidebarOpenIds({
      [knownGroupId]: true,
      'unknown-group': true,
      another: 'open',
    })).toEqual({ [knownGroupId]: true });
  });

  test('닫힌 boolean 상태도 기존 저장 형식대로 보존한다', () => {
    expect(normalizeSidebarOpenIds({ [knownGroupId]: false })).toEqual({
      [knownGroupId]: false,
    });
  });
});
