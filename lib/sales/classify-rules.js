/**
 * 메뉴판매량 분류 규칙 (MS-3-1 + MS-9)
 *
 * 책임:
 * - 정규화된 메뉴명 → (category, groupName, detailName) 매핑
 * - 8개 기본 규칙(MS-3-1) + 60개 확장 규칙(MS-9)
 * - 순수 데이터 구조 (별칭 치환 규칙 미포함)
 *
 * 규칙 순서: 기본 8개 → MS-9 60개 (first-match 우선순위)
 */

import { MS9_RULES } from './ms9-rules.js';
import { EXTRA_RULES } from './extra-rules.js';

const BASIC_RULES = [
  {
    ruleId: 'rule_personal_001',
    name: '1인피자 - 더블치즈',
    pattern: '더블치즈',
    matchType: 'exact',
    category: '1인피자',
    groupName: '더블치즈',
    detailName: '더블치즈',
  },
  {
    ruleId: 'rule_pizza_001',
    name: '피자 - 뉴더블치즈피자',
    pattern: '뉴더블치즈피자',
    matchType: 'exact',
    category: '피자',
    groupName: '뉴더블치즈',
    detailName: '뉴더블치즈피자',
  },
  {
    ruleId: 'rule_pizza_002',
    name: '피자 - 레드핫그릴치킨',
    pattern: '레드핫그릴치킨',
    matchType: 'exact',
    category: '피자',
    groupName: '레드핫그릴치킨',
    detailName: '레드핫그릴치킨',
  },
  {
    ruleId: 'rule_pizza_003_l',
    name: '피자 - 샘스테이크 L',
    pattern: '샘스테이크 L',
    matchType: 'exact',
    category: '피자',
    groupName: '샘스테이크',
    detailName: '샘스테이크L',
  },
  {
    ruleId: 'rule_pizza_003_r',
    name: '피자 - 샘스테이크 R',
    pattern: '샘스테이크 R',
    matchType: 'exact',
    category: '피자',
    groupName: '샘스테이크',
    detailName: '샘스테이크R',
  },
  {
    ruleId: 'rule_side_001',
    name: '사이드 - 오븐스파게티',
    pattern: '오븐스파게티',
    matchType: 'exact',
    category: '사이드',
    groupName: '오븐스파게티',
    detailName: '오븐스파게티',
  },
  {
    ruleId: 'rule_sauce_001',
    name: '사이드(소스) - 파마산',
    pattern: '파마산',
    matchType: 'exact',
    category: '사이드(소스)',
    groupName: '파마산',
    detailName: '파마산',
  },
  {
    ruleId: 'rule_drink_001',
    name: '음료 - 콜라',
    pattern: '콜라',
    matchType: 'exact',
    category: '음료',
    groupName: '콜라',
    detailName: '콜라',
  },
];

export const SALES_RULES = [...BASIC_RULES, ...MS9_RULES, ...EXTRA_RULES];
