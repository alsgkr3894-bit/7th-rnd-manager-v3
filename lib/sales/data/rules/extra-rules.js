/**
 * lib/sales/extra-rules.js — v3 추가 분류 규칙
 *
 * v2 BASIC_RULES + MS9_RULES에서 누락됐던 콤보/변경/떡볶이 패턴.
 * 사용자가 미매칭으로 자주 잡았던 메뉴를 정규화 후 패턴으로 추가.
 *
 * 정규화 규칙:
 *   - 괄호: 좌괄호 → 공백, 우괄호 제거 → "고구마피자(L)+떡볶이" → "고구마피자 L+떡볶이"
 *   - 공백: 연속 공백 → 단일 공백
 */

export const EXTRA_RULES = [
  // ============================================================
  // 피자+사이드 세트 콤보 → 세트메뉴 카테고리로 분류
  //   - 피자+떡볶이
  //   - 피자+롱츄러스+할라피뇨쨈
  // ============================================================
  {
    ruleId: 'rule_set_combo_001',
    name: '세트 - 고구마피자 L +떡볶이',
    pattern: '고구마피자 L+떡볶이',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+사이드 세트',
    detailName: '고구마L+떡볶이',
  },
  {
    ruleId: 'rule_set_combo_002',
    name: '세트 - 고구마피자 R +떡볶이',
    pattern: '고구마피자 R+떡볶이',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+사이드 세트',
    detailName: '고구마R+떡볶이',
  },
  {
    ruleId: 'rule_set_combo_003',
    name: '세트 - 포테이토 L +롱츄러스+할라피뇨쨈',
    pattern: '포테이토 피자 L+롱츄러스+할라피뇨쨈',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+사이드 세트',
    detailName: '포테이토L+롱츄러스+할라피뇨쨈',
  },
  {
    ruleId: 'rule_set_combo_004',
    name: '세트 - 샘스테이크 L +롱츄러스+할라피뇨쨈',
    pattern: '샘스테이크 피자 L+롱츄러스+할라피뇨쨈',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+사이드 세트',
    detailName: '샘스테이크L+롱츄러스+할라피뇨쨈',
  },
  {
    ruleId: 'rule_set_combo_005',
    name: '세트 - 화이트쉬림프 L +롱츄러스+할라피뇨쨈',
    pattern: '화이트쉬림프 피자 L+롱츄러스+할라피뇨쨈',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+사이드 세트',
    detailName: '화이트쉬림프L+롱츄러스+할라피뇨쨈',
  },
  {
    ruleId: 'rule_set_combo_006',
    name: '세트 - 컨츄리치킨 L +롱츄러스+할라피뇨쨈',
    pattern: '컨츄리치킨 피자 L+롱츄러스+할라피뇨쨈',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '피자+사이드 세트',
    detailName: '컨츄리치킨L+롱츄러스+할라피뇨쨈',
  },

  // ============================================================
  // 사이드+콘코울슬로 세트 → 세트메뉴 카테고리
  // (콘코울슬로는 classify.js의 콤보 분할 로직이 자동으로 별도 가상 행 추가)
  // ============================================================
  {
    ruleId: 'rule_set_side_001',
    name: '세트 - 케이준 치킨텐더 5PCS+콘코울슬로',
    pattern: '케이준 치킨텐더 5PCS+콘코울슬로',
    matchType: 'exact',
    category: '세트메뉴',
    groupName: '사이드+콘코울슬로',
    detailName: '케이준치킨텐더5PCS+콘코울슬로',
  },

  // ============================================================
  // 피자 "변경" 단독 (BASIC/MS9에 없는 그룹)
  // ============================================================
  {
    ruleId: 'rule_pizza_change_001',
    name: '피자 - 새우파티 변경',
    pattern: '새우파티 변경',
    matchType: 'exact',
    category: '피자',
    groupName: '새우파티',
    detailName: '새우파티',
  },
  {
    ruleId: 'rule_pizza_change_002',
    name: '피자 - 페스티벌 변경',
    pattern: '페스티벌 변경',
    matchType: 'exact',
    category: '피자',
    groupName: '페스티벌',
    detailName: '페스티벌',
  },
  {
    ruleId: 'rule_pizza_change_003',
    name: '피자 - 7번가스페셜 변경',
    pattern: '7번가스페셜 변경',
    matchType: 'exact',
    category: '피자',
    groupName: '7번가스페셜',
    detailName: '7번가스페셜',
  },

  // ============================================================
  // 사이드 - 떡볶이 ('선택' / '추가' 패턴) — ms9 떡볶이 그룹과 동일 detailName으로 합산
  // ============================================================
  {
    ruleId: 'rule_side_tteok_001',
    name: '사이드 - 페페로니치즈 떡볶이 선택 → 페페로니떡볶이 통합',
    pattern: '페페로니치즈 떡볶이 선택',
    matchType: 'exact',
    category: '사이드',
    groupName: '페페로니떡볶이',
    detailName: '페페로니떡볶이',
  },
  {
    ruleId: 'rule_side_tteok_002',
    name: '사이드 - 체다골드포테이토 떡볶이 선택',
    pattern: '체다골드포테이토 떡볶이 선택',
    matchType: 'exact',
    category: '사이드',
    groupName: '체다골드포테이토떡볶이',
    detailName: '체다골드포테이토떡볶이',
  },
  {
    ruleId: 'rule_side_tteok_003',
    name: '사이드 - 체다골드포테이토 떡볶이 추가',
    pattern: '체다골드포테이토 떡볶이 추가',
    matchType: 'exact',
    category: '사이드',
    groupName: '체다골드포테이토떡볶이',
    detailName: '체다골드포테이토떡볶이',
  },
  {
    ruleId: 'rule_side_tteok_004',
    name: '사이드 - 오븐치즈 떡볶이 선택',
    pattern: '오븐치즈 떡볶이 선택',
    matchType: 'exact',
    category: '사이드',
    groupName: '오븐치즈떡볶이',
    detailName: '오븐치즈떡볶이',
  },
];
