import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  floatingListPlacement,
  isSameFloatingPlacement,
} from '../../components/menu-master/recipe/floatingListPlacement.js';

// 2026-10-30: 레시피 구성품 표·레시피 영역·수정 창에 overflow가 걸려 있어, 자동완성 목록을 표 안에
// absolute로 두면 마지막 줄·구성품이 적을 때 목록이 잘려 "입력해도 자동완성이 안 나온다"로 보였다.
// 목록을 body로 포털해 화면(fixed) 기준으로 띄운다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const viewport = { width: 1024, height: 768 };
const anchorAt = (top, height = 34) => ({ left: 100, top, bottom: top + height, width: 400 });

describe('자동완성 목록 위치 계산', () => {
  test('아래 여유가 충분하면 입력칸 바로 아래에 최대 높이로 연다', () => {
    const p = floatingListPlacement(anchorAt(200), viewport, { maxHeight: 220 });
    expect(p.openUp).toBe(false);
    expect(p.top).toBe(200 + 34 + 4);
    expect(p.maxHeight).toBe(220);
    expect(p.left).toBe(100);
    expect(p.width).toBe(400);
  });

  test('화면 아래쪽이라 자리가 모자라고 위가 더 넓으면 위로 연다', () => {
    const p = floatingListPlacement(anchorAt(700), viewport, { maxHeight: 220 });
    expect(p.openUp).toBe(true);
    expect(p.bottom).toBe(768 - 700 + 4);
    expect(p.maxHeight).toBe(220);
    expect(p.top).toBeUndefined();
  });

  test('위아래 모두 좁으면 더 넓은 쪽에 최소 높이 이상으로 연다', () => {
    const tiny = { width: 1024, height: 200 };
    const p = floatingListPlacement(anchorAt(90), tiny, { maxHeight: 220 });
    expect(p.maxHeight).toBeGreaterThanOrEqual(80);
  });

  test('화면 밖으로 나가지 않게 좌우를 맞춘다', () => {
    const wide = floatingListPlacement(
      { left: 900, top: 100, bottom: 134, width: 400 },
      viewport,
      {}
    );
    expect(wide.left + wide.width).toBeLessThanOrEqual(1024 - 8);
    expect(wide.width).toBeLessThanOrEqual(1024 - 16);
  });

  test('같은 값이면 같은 위치로 본다(렌더마다 다시 재도 상태가 안 바뀜)', () => {
    const a = floatingListPlacement(anchorAt(200), viewport);
    expect(isSameFloatingPlacement(a, { ...a, left: a.left + 0.2 })).toBe(true);
    expect(isSameFloatingPlacement(a, { ...a, top: a.top + 5 })).toBe(false);
    expect(isSameFloatingPlacement(null, a)).toBe(false);
  });
});

describe('레시피 자동완성 목록은 잘리지 않는 위치에 뜬다', () => {
  test('행 식자재칸·빠른 추가 칸이 FloatingSuggestionList(포털)를 쓴다', () => {
    const row = read('components/menu-master/recipe/MenuRecipeTableRow.jsx');
    const quick = read('components/menu-master/recipe/MenuRecipeQuickAddPanel.jsx');
    expect(row).toContain('<FloatingSuggestionList');
    expect(quick).toContain('<FloatingSuggestionList');
    // 표 안에 absolute로 두던 목록이 다시 생기지 않는다
    expect(row).not.toMatch(/role="listbox"/);
    expect(quick).not.toMatch(/role="listbox"/);
  });

  test('목록은 body로 포털되고 fixed 위치로 뜬다', () => {
    const src = read('components/menu-master/recipe/FloatingSuggestionList.jsx');
    expect(src).toContain('createPortal(');
    expect(src).toContain('document.body');
    expect(src).toContain("position: 'fixed'");
  });

  test('목록이 열려 있을 때 Esc는 목록만 닫고 수정 창은 닫지 않는다', () => {
    expect(read('components/menu-master/useRecipeIngredientSearch.js')).toContain(
      'e.stopPropagation?.()'
    );
    expect(read('components/menu-master/recipe/hooks/useMenuRecipeQuickAdd.js')).toContain(
      'e.stopPropagation?.()'
    );
  });
});
