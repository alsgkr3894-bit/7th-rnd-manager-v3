import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const src = f => readFileSync(resolve(f), 'utf8');

/**
 * 1인용피자 전용 크러스트 슬롯(항목 12) — 기존엔 씬바사삭L(일반 씬바샤삭)에
 * 1인용 데이터를 함께 넣고 있었다. 전용 슬롯을 추가하고 기존 데이터를
 * 자동 이관한다. 알레르기 계산은 절대 건드리면 안 된다(법적 표기 영향) —
 * 아래 첫 번째 describe가 그 안전장치를 확인한다.
 */
describe('1인용피자 알레르기 계산은 씬도우 규칙을 그대로 쓴다 (회귀 방지)', () => {
  test('pizza.js가 알레르기 조회에는 여전히 THIN_CRUST_CODE를 쓴다', () => {
    // EDGE_ALLERGEN_RULES/MENU_EDGE_ALLERGEN_RULES(대두 제거 등)가 '씬바사삭L'
    // 문자열에 매여 있다 — 영양값 입력 슬롯을 1인용피자로 옮겼다고 이 인자까지
    // 바꾸면 그 규칙들이 1인용피자에는 조용히 적용되지 않게 된다.
    const s = src('lib/nutrition/label/sheets/pizza.js');
    expect(s).toMatch(
      /allergenText\(\s*menuAllergenMap,\s*edgeAllergenMap,\s*menu\.menuCode,\s*THIN_CRUST_CODE,/
    );
    // 영양값(중량/열량) 조회는 반대로 전용 슬롯을 우선해야 한다.
    expect(s).toContain('rawMap[`${menu.menuCode}__${PERSONAL_PIZZA_CRUST_CODE}`]');
  });

  test('씬도우 알레르기 규칙(대두 제거 등)은 여전히 씬바사삭L 하나만 가리킨다', () => {
    const s = src('lib/nutrition/allergen/rules.js');
    expect(s).toContain("edgeCodes: ['씬바사삭L']");
    expect(s).not.toContain('1인용피자');
  });
});

describe('크러스트 설정에 1인용피자 슬롯이 추가됐다', () => {
  test('crust-config.js가 4번째 CRUST_TYPES로 1인용피자를 포함한다', () => {
    const s = src('lib/nutrition/crust-config.js');
    expect(s).toContain(
      "export const CRUST_TYPES = ['석쇠L', '석쇠R', THIN_CRUST_CODE, PERSONAL_PIZZA_CRUST_CODE];"
    );
  });

  test('import.js의 1인용 매칭 패턴이 전용 크러스트를 타깃한다', () => {
    const s = src('lib/nutrition/values/import.js');
    expect(s).toContain('crustType: PERSONAL_PIZZA_CRUST_CODE, personal: true');
  });
});

describe('migratePersonalPizzaCrustType — 멱등 이관', () => {
  test('P-ONE 코드거나 이름에 1인용이 들어간 씬바사삭L 행만 옮긴다', () => {
    const s = src('lib/nutrition/values/personal-pizza-migration.js');
    expect(s).toContain("code.startsWith('P-ONE')");
    expect(s).toContain("name.includes('1인용')");
    expect(s).toContain('row?.crustType === THIN_CRUST_CODE');
    expect(s).toContain('crustType: PERSONAL_PIZZA_CRUST_CODE');
  });

  test('영양성분 페이지 로드 시 자동 실행된다(관리자 권한 없이, normalizePersonalPizzaCodes와 동일 패턴)', () => {
    const s = src('app/nutrition/menu/page.jsx');
    expect(s).toContain("from '@/lib/nutrition/values/personal-pizza-migration'");
    expect(s).toContain('migratePersonalPizzaCrustType()');
  });
});

describe('베이스 영양성분 화면이 1인용피자는 전용 슬롯 하나만 보여준다', () => {
  test('NutritionInputPanel이 1인용피자면 크러스트 탭을 1개로 제한한다', () => {
    const s = src('components/nutrition/menu/base/NutritionInputPanel.jsx');
    expect(s).toContain('const PERSONAL_CRUST_OPTIONS = [PERSONAL_PIZZA_CRUST_CODE];');
    expect(s).toContain('if (isPersonal) return PERSONAL_CRUST_OPTIONS;');
  });

  test('MenuGroupList가 1인용피자 메뉴의 완료 표시도 슬롯 1개 기준으로 계산한다', () => {
    const s = src('components/nutrition/menu/base/MenuGroupList.jsx');
    expect(s).toContain('const PERSONAL_CRUST_SLOTS = [PERSONAL_PIZZA_CRUST_CODE];');
    expect(s).toMatch(/isPersonal\s*\?\s*PERSONAL_CRUST_SLOTS/);
  });
});
