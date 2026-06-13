/**
 * 메뉴판매량 확장 분류 규칙 — 세트메뉴 카테고리 (MS-9)
 *
 * 정책: MENU_SALES_DETAILED_POLICY.md "메뉴 그룹 매핑 규칙" 참조
 */

export const MS9_RULES_SET = [
  // ============================================================
  // 세트메뉴 카테고리 (26개)
  // 5개 그룹: 피자세트, 피크닉박스, 파티박스 (L/R), 피자+사이드세트, 1인피자세트
  // ============================================================

  // 피자세트 (L/R 단독, 2개)
  {
    ruleId: 'rule_set_001',
    name: '세트메뉴 - 피자세트 L',
    pattern: '피자 L세트',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자세트',
    detailName: '피자세트L',
  },
  {
    ruleId: 'rule_set_002',
    name: '세트메뉴 - 피자세트 R',
    pattern: '피자 R세트',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자세트',
    detailName: '피자세트R',
  },

  // 피크닉박스 (L/R 단독, 2개)
  {
    ruleId: 'rule_set_003',
    name: '세트메뉴 - 피크닉박스 L',
    pattern: '피크닉박스 L',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피크닉박스',
    detailName: '피크닉박스L',
  },
  {
    ruleId: 'rule_set_004',
    name: '세트메뉴 - 피크닉박스 R',
    pattern: '피크닉박스 R',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피크닉박스',
    detailName: '피크닉박스R',
  },

  // 파티박스 (L/R 단독, 2개)
  {
    ruleId: 'rule_set_005',
    name: '세트메뉴 - 파티박스 L',
    pattern: '파티박스 L',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '파티박스',
    detailName: '파티박스L',
  },
  {
    ruleId: 'rule_set_006',
    name: '세트메뉴 - 파티박스 R',
    pattern: '파티박스 R',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '파티박스',
    detailName: '파티박스R',
  },

  // 피자+스파게티 세트 (L/R/P 사이즈 + 1인피자 통합)
  {
    ruleId: 'rule_set_010',
    name: '세트메뉴 - 슈퍼콤비네이션 L+스파게티',
    pattern: '슈퍼콤비네이션 피자 L+스파게티',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+스파게티 세트',
    detailName: '슈퍼콤비네이션L+스파게티',
  },
  {
    ruleId: 'rule_set_011',
    name: '세트메뉴 - 샘스테이크 L+스파게티',
    pattern: '샘스테이크 피자 L+스파게티',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+스파게티 세트',
    detailName: '샘스테이크L+스파게티',
  },
  {
    ruleId: 'rule_set_012',
    name: '세트메뉴 - 체다골드포테이토 L+스파게티',
    pattern: '체다골드포테이토 피자 L+스파게티',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+스파게티 세트',
    detailName: '체다골드포테이토L+스파게티',
  },
  {
    ruleId: 'rule_set_013',
    name: '세트메뉴 - 칠리크림불갈비 L+스파게티',
    pattern: '칠리크림불갈비 피자 L+스파게티',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+스파게티 세트',
    detailName: '칠리크림불갈비L+스파게티',
  },
  {
    ruleId: 'rule_set_014',
    name: '세트메뉴 - 칠리크림불갈비 R+스파게티',
    pattern: '칠리크림불갈비 피자 R+스파게티',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+스파게티 세트',
    detailName: '칠리크림불갈비R+스파게티',
  },
  {
    ruleId: 'rule_set_015',
    name: '세트메뉴 - 페페로니 L+스파게티',
    pattern: '페페로니 피자 L+스파게티',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+스파게티 세트',
    detailName: '페페로니L+스파게티',
  },
  {
    ruleId: 'rule_set_016',
    name: '세트메뉴 - 고구마 L+스파게티',
    pattern: '고구마 피자 L+스파게티',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+스파게티 세트',
    detailName: '고구마L+스파게티',
  },
  {
    ruleId: 'rule_set_017',
    name: '세트메뉴 - 오리지널 피자+스파게티',
    pattern: '오리지널 피자+스파게티',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+스파게티 세트',
    detailName: '오리지널 피자+스파게티',
  },

  // 피자+떡볶이 세트
  {
    ruleId: 'rule_set_018',
    name: '세트메뉴 - 오리지널 피자+떡볶이',
    pattern: '오리지널 피자+떡볶이',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+떡볶이 세트',
    detailName: '오리지널 피자+떡볶이',
  },

  // 피자+사이드 세트 (+치킨바사삭/+핫윙/+흑미크림 찰치즈볼)
  {
    ruleId: 'rule_set_019',
    name: '세트메뉴 - 오리지널 피자+치킨바사삭',
    pattern: '오리지널 피자+치킨바사삭',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+사이드 세트',
    detailName: '오리지널 피자+치킨바사삭',
  },

  // 기타 (변경 명시 없음 - 별도 유지)
  {
    ruleId: 'rule_set_020',
    name: '세트메뉴 - 스파게티+사이드 세트',
    pattern: '스파게티+사이드 세트',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '스파게티+사이드 세트',
    detailName: '스파게티+사이드 세트',
  },

  // 1인피자(P) + 스파게티 → 1인피자 세트
  {
    ruleId: 'rule_set_030',
    name: '세트메뉴 - 더블치즈 P+스파게티',
    pattern: '더블치즈 피자 P+스파게티',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '1인피자 세트',
    detailName: '더블치즈P+스파게티',
  },
  {
    ruleId: 'rule_set_031',
    name: '세트메뉴 - 페페로니 P+스파게티',
    pattern: '페페로니 피자 P+스파게티',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '1인피자 세트',
    detailName: '페페로니P+스파게티',
  },
  {
    ruleId: 'rule_set_032',
    name: '세트메뉴 - 고르곤졸라 P+스파게티',
    pattern: '고르곤졸라 피자 P+스파게티',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '1인피자 세트',
    detailName: '고르곤졸라P+스파게티',
  },
  {
    ruleId: 'rule_set_034',
    name: '세트메뉴 - 1인 피자+스파게티 세트',
    pattern: '1인 피자+스파게티 세트',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '1인피자 세트',
    detailName: '1인 피자+스파게티 세트',
  },
  {
    ruleId: 'rule_set_035',
    name: '세트메뉴 - 1인 반반 피자+스파게티 세트',
    pattern: '1인 반반 피자+스파게티 세트',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '1인피자 세트',
    detailName: '1인 반반 피자+스파게티 세트',
  },

  // 1인피자 + 떡볶이/사이드
  {
    ruleId: 'rule_set_038',
    name: '세트메뉴 - 하와이안 P+떡볶이',
    pattern: '하와이안 피자 P+떡볶이',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+떡볶이 세트',
    detailName: '하와이안P+떡볶이',
  },
  {
    ruleId: 'rule_set_036',
    name: '세트메뉴 - 1인 피자+핫윙 세트',
    pattern: '1인 피자+핫윙 세트',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+사이드 세트',
    detailName: '1인 피자+핫윙 세트',
  },
  {
    ruleId: 'rule_set_037',
    name: '세트메뉴 - 더블치즈 P+흑미크림 찰치즈볼',
    pattern: '더블치즈 피자 P+흑미크림 찰치즈볼',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+사이드 세트',
    detailName: '더블치즈P+흑미크림 찰치즈볼',
  },

  // 1인 피자 세트 (단일)
  {
    ruleId: 'rule_set_033',
    name: '세트메뉴 - 1인 피자 세트',
    pattern: '1인 피자 세트',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '1인피자 세트',
    detailName: '1인 피자 세트',
  },
];
