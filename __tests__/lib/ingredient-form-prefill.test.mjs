/**
 * __tests__/lib/ingredient-form-prefill.test.mjs
 *
 * pickRememberedUnit 순수 함수 테스트.
 * 회귀 방지: 지연된 localStorage 하이드레이션이 사용자가 먼저 입력한
 * 포장수량/단위를 덮어쓰던 버그(g로 입력했는데 개로 저장)를 막는다.
 */

import { pickRememberedUnit } from '../../app/ingredient/manage/ingredientFormPrefill.js';

const PRISTINE = JSON.stringify({ baseQuantity: '', baseUnitType: 'g' });

describe('pickRememberedUnit', () => {
  test('손대지 않은 신규 폼 + 기억된 단위가 개 → 개 적용', () => {
    expect(
      pickRememberedUnit({
        isNew: true,
        hydrated: true,
        formJson: PRISTINE,
        pristineJson: PRISTINE,
        lastUnitType: '개',
      })
    ).toBe('개');
  });

  test('사용자가 포장수량을 먼저 입력했으면 단위를 덮어쓰지 않는다 (핵심 회귀)', () => {
    const touched = JSON.stringify({ baseQuantity: '1000', baseUnitType: 'g' });
    expect(
      pickRememberedUnit({
        isNew: true,
        hydrated: true,
        formJson: touched,
        pristineJson: PRISTINE,
        lastUnitType: '개',
      })
    ).toBeNull();
  });

  test('사용자가 단위를 직접 바꿨으면 그대로 보존한다', () => {
    const touched = JSON.stringify({ baseQuantity: '', baseUnitType: '개' });
    expect(
      pickRememberedUnit({
        isNew: true,
        hydrated: true,
        formJson: touched,
        pristineJson: PRISTINE,
        lastUnitType: '개',
      })
    ).toBeNull();
  });

  test('기억된 단위가 기본값 g면 적용할 게 없다', () => {
    expect(
      pickRememberedUnit({
        isNew: true,
        hydrated: true,
        formJson: PRISTINE,
        pristineJson: PRISTINE,
        lastUnitType: 'g',
      })
    ).toBeNull();
  });

  test('하이드레이션 전에는 적용하지 않는다', () => {
    expect(
      pickRememberedUnit({
        isNew: true,
        hydrated: false,
        formJson: PRISTINE,
        pristineJson: PRISTINE,
        lastUnitType: '개',
      })
    ).toBeNull();
  });

  test('편집/복사 폼(isNew=false)은 기존 값을 유지한다', () => {
    expect(
      pickRememberedUnit({
        isNew: false,
        hydrated: true,
        formJson: PRISTINE,
        pristineJson: PRISTINE,
        lastUnitType: '개',
      })
    ).toBeNull();
  });

  test('lastUnitType 누락 시 안전하게 null', () => {
    expect(
      pickRememberedUnit({
        isNew: true,
        hydrated: true,
        formJson: PRISTINE,
        pristineJson: PRISTINE,
        lastUnitType: '',
      })
    ).toBeNull();
  });
});
