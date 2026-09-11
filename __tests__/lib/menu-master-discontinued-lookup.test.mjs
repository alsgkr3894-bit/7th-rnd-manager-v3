import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
  buildDiscontinuedMenuNameSet,
  isDiscontinuedMenuName,
  buildMenuMasterNameSet,
  isKnownMenuMasterName,
} from '../../lib/menu-master/discontinued-lookup.js';

const src = f => readFileSync(resolve(f), 'utf8');

describe('buildDiscontinuedMenuNameSet / isDiscontinuedMenuName', () => {
  test('status가 discontinued인 행의 메뉴명만 모은다', () => {
    const rows = [
      { menuName: '샘스테이크 피자', status: 'active' },
      { menuName: '단종메뉴', status: 'discontinued' },
      { menuName: '테스트메뉴', status: 'test' },
      { menuName: '', status: 'discontinued' }, // 빈 이름은 무시
    ];
    const set = buildDiscontinuedMenuNameSet(rows);
    expect(set.has('단종메뉴')).toBe(true);
    expect(set.has('샘스테이크 피자')).toBe(false);
    expect(set.size).toBe(1);
  });

  test('괄호·공백 표기가 달라도 정규화 후 매칭한다', () => {
    const set = buildDiscontinuedMenuNameSet([
      { menuName: '샘스테이크(L)', status: 'discontinued' },
    ]);
    expect(isDiscontinuedMenuName('샘스테이크 L', set)).toBe(true);
    expect(isDiscontinuedMenuName('전혀 다른 메뉴', set)).toBe(false);
  });

  test('빈 집합·잘못된 입력에는 false를 반환한다(오탐 방지)', () => {
    expect(isDiscontinuedMenuName('아무거나', new Set())).toBe(false);
    expect(isDiscontinuedMenuName('아무거나', null)).toBe(false);
    expect(buildDiscontinuedMenuNameSet(null).size).toBe(0);
    expect(buildDiscontinuedMenuNameSet(undefined).size).toBe(0);
  });

  test('판매 분류 규칙에 매칭되는 피자는 판매 화면 축약 그룹명으로도 조회된다', () => {
    // 판매량 "월별 순위" 화면은 menu_master 원본명("고구마 피자")이 아니라
    // 판매 분류 규칙의 groupName("고구마")으로 표시한다 — 두 이름 모두로 조회돼야 한다.
    const set = buildDiscontinuedMenuNameSet([{ menuName: '고구마 피자', status: 'discontinued' }]);
    expect(isDiscontinuedMenuName('고구마 피자', set)).toBe(true);
    expect(isDiscontinuedMenuName('고구마', set)).toBe(true);
  });

  test('판매 분류 규칙에 없는 메뉴는 원본명으로만 조회되고 다른 메뉴와 충돌하지 않는다', () => {
    const set = buildDiscontinuedMenuNameSet([
      { menuName: '전혀 매칭 안 되는 임의 메뉴명 XYZ', status: 'discontinued' },
    ]);
    expect(set.size).toBe(1);
    expect(isDiscontinuedMenuName('전혀 매칭 안 되는 임의 메뉴명 XYZ', set)).toBe(true);
  });
});

describe('buildMenuMasterNameSet / isKnownMenuMasterName', () => {
  test('상태와 무관하게 모든 메뉴명을 모은다', () => {
    const rows = [
      { menuName: '활성메뉴', status: 'active' },
      { menuName: '단종메뉴', status: 'discontinued' },
      { menuName: '테스트메뉴', status: 'test' },
      { menuName: '', status: 'active' }, // 빈 이름은 무시
    ];
    const set = buildMenuMasterNameSet(rows);
    expect(isKnownMenuMasterName('활성메뉴', set)).toBe(true);
    expect(isKnownMenuMasterName('단종메뉴', set)).toBe(true);
    expect(isKnownMenuMasterName('테스트메뉴', set)).toBe(true);
    expect(set.size).toBe(3);
  });

  test('menu_master에 없는 판매명은 false', () => {
    const set = buildMenuMasterNameSet([{ menuName: '등록된메뉴', status: 'active' }]);
    expect(isKnownMenuMasterName('등록안된메뉴', set)).toBe(false);
  });

  test('피자 그룹명(판매 분류 규칙 groupName)도 등록된 것으로 조회된다', () => {
    const set = buildMenuMasterNameSet([{ menuName: '고구마 피자', status: 'active' }]);
    expect(isKnownMenuMasterName('고구마 피자', set)).toBe(true);
    expect(isKnownMenuMasterName('고구마', set)).toBe(true);
  });

  test('빈 집합·잘못된 입력에는 false를 반환한다', () => {
    expect(isKnownMenuMasterName('아무거나', new Set())).toBe(false);
    expect(isKnownMenuMasterName('아무거나', null)).toBe(false);
    expect(buildMenuMasterNameSet(null).size).toBe(0);
  });
});

describe('판매 순위 화면에 단종 배지가 연결돼 있다', () => {
  test('RankRow가 useDiscontinuedMenuNames로 단종 배지를 렌더한다', () => {
    const s = src('components/sales/RankRow.jsx');
    expect(s).toContain("from '@/hooks/useDiscontinuedMenuNames'");
    expect(s).toContain('isDiscontinuedMenuName(name, discontinuedNames)');
    expect(s).toContain('DiscontinuedBadge');
  });

  test('useDiscontinuedMenuNames는 실패해도 빈 Set으로 폴백한다', () => {
    const s = src('hooks/useDiscontinuedMenuNames.js');
    expect(s).toContain('EMPTY_SET');
    expect(s).toContain('onError: () => {}');
  });
});
