import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import {
  buildDiscontinuedMenuNameSet,
  isDiscontinuedMenuName,
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
