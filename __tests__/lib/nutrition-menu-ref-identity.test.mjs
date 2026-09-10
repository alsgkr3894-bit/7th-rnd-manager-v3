import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

/**
 * 베이스 영양성분 메뉴명/코드 수정(updateMenuRefIdentity) 배선 확인.
 * 코드가 바뀌면 nutrition_raw_values도 같은 트랜잭션에서 함께 옮겨야 한다 —
 * 그냥 upsertMenuRef({id, menuCode: newCode})만 부르면 menu_ref는 새 코드로
 * 바뀌지만 raw_values는 옛 코드에 남아 그 메뉴의 영양값이 조용히 사라진다.
 */
describe('updateMenuRefIdentity — 메뉴명/코드 수정 + raw_values 이관', () => {
  test('코드가 바뀌면 raw_values를 같은 트랜잭션에서 새 코드로 옮긴다', () => {
    const s = src('lib/nutrition/values/menu-refs.js');
    expect(s).toContain('export async function updateMenuRefIdentity');
    expect(s).toMatch(/filter\(\s*row => row\.menuCode === oldCode/);
    expect(s).toMatch(/runTransaction\(stores, 'readwrite', tx => \{[\s\S]*?rawStore\.put/);
  });

  test('이미 쓰이고 있는 코드로는 바꿀 수 없다(충돌 방지)', () => {
    const s = src('lib/nutrition/values/menu-refs.js');
    expect(s).toContain('throw new Error(`이미 사용 중인 코드입니다');
  });

  test('코드가 그대로면(이름만 변경) raw_values 이관 없이 단순 upsert로 처리한다', () => {
    const s = src('lib/nutrition/values/menu-refs.js');
    expect(s).toContain('if (newCode === oldCode) {');
    expect(s).toContain('return upsertMenuRef(');
  });

  test('store.js 배럴이 updateMenuRefIdentity를 re-export한다', () => {
    const s = src('lib/nutrition/values/store.js');
    expect(s).toContain('updateMenuRefIdentity');
  });
});

describe('베이스 영양성분 화면에 수정 UI가 연결돼 있다', () => {
  test('NutritionInputPanel에 수정 버튼이 있다', () => {
    const s = src('components/nutrition/menu/base/NutritionInputPanel.jsx');
    expect(s).toContain('onEditMenu');
    expect(s).toContain('메뉴명·코드 수정');
  });

  test('TabBase가 EditMenuModal을 렌더하고 코드 변경 시 selMenu를 갱신한다', () => {
    const s = src('components/nutrition/menu/TabBase.jsx');
    expect(s).toContain("from '@/components/nutrition/menu/base/EditMenuModal'");
    expect(s).toContain('<EditMenuModal');
    expect(s).toContain('if (updated) setSelMenu(prev => ({ ...prev, ...updated }));');
  });

  test('EditMenuModal이 updateMenuRefIdentity를 호출한다', () => {
    const s = src('components/nutrition/menu/base/EditMenuModal.jsx');
    expect(s).toContain("from '@/lib/nutrition/values/store'");
    expect(s).toContain('updateMenuRefIdentity(menu, {');
  });
});
