/**
 * "모든 데이터 초기화"가 다른 브랜드에서 7번가 공유 데이터를 서버에서 지우던 문제
 * (2026-09-29 점검에서 발견). 공유 store는 main DB에만 살지만 스키마는 모든 브랜드 DB에 빈
 * store를 만들어 두고, clearStore의 서버 삭제는 공유 store를 항상 brandId:'main'으로 태깅한다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';
import { MAIN_BRAND_ID, planBrandReset } from '../../lib/db/reset-plan.js';
import { SHARED_STORE_NAMES } from '../../lib/db/module-stores.js';

const ALL = [
  'menu_master',
  'cost_ingredients',
  'menu_dev_notes',
  'sample_records',
  'market_research',
  'note_schedules',
  'work_log',
  'rnd_corporate_card_entries',
  'rnd_login_credentials',
];

describe('planBrandReset', () => {
  test('main(7번가)에서는 전부 초기화한다', () => {
    const plan = planBrandReset(ALL, MAIN_BRAND_ID);
    expect(plan.stores).toEqual(ALL);
    expect(plan.skippedShared).toEqual([]);
  });

  test.each(['china4', 'icheon'])('%s에서는 공유 store를 초기화 대상에서 뺀다', brandId => {
    const plan = planBrandReset(ALL, brandId);
    expect(plan.stores).toEqual(['menu_master', 'cost_ingredients']);
    expect(plan.skippedShared).toEqual([
      'menu_dev_notes',
      'sample_records',
      'market_research',
      'note_schedules',
      'work_log',
      'rnd_corporate_card_entries',
      'rnd_login_credentials',
    ]);
  });

  test('공유 store 7종이 실제로 SHARED_STORE_NAMES에 있다 (이 방어의 전제)', () => {
    for (const name of ALL.slice(2)) expect(SHARED_STORE_NAMES.has(name)).toBe(true);
    expect(SHARED_STORE_NAMES.has('menu_master')).toBe(false);
  });

  test('브랜드가 비어 있거나 모르는 값이면 안전한 쪽(공유 유지)으로 간다', () => {
    expect(planBrandReset(ALL, '').skippedShared).toHaveLength(7);
    expect(planBrandReset(ALL, undefined).skippedShared).toHaveLength(7);
  });

  test('입력이 배열이 아니어도 던지지 않는다', () => {
    expect(planBrandReset(undefined, 'china4')).toEqual({ stores: [], skippedShared: [] });
  });
});

describe('시스템 설정 화면이 초기화 계획을 실제로 쓴다', () => {
  const page = readFileSync(resolve('app/settings/system/page.jsx'), 'utf8');

  test('초기화 루프는 ALL_STORES가 아니라 계획된 stores를 돈다', () => {
    expect(page).toContain('planBrandReset(ALL_STORES, getActiveBrandId())');
    expect(page).toContain('for (const name of stores)');
    expect(page).not.toContain('for (const name of ALL_STORES)');
  });

  test('공유 데이터를 건너뛰었으면 그 사실을 알린다', () => {
    expect(page).toContain('skippedShared.length');
    expect(page).toContain('isSharedDataProtected');
  });
});
