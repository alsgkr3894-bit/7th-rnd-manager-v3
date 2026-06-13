/**
 * 메뉴판매량 확장 분류 규칙 — 엣지&도우·하프앤하프 카테고리 (MS-9)
 *
 * 정책: MENU_SALES_DETAILED_POLICY.md "메뉴 그룹 매핑 규칙" 참조
 */

export const MS9_RULES_EDGE = [
  // ============================================================
  // 엣지&도우 카테고리 (10개)
  // ============================================================

  // 석쇠 (3개)
  {
    ruleId: 'rule_edge_001',
    name: '엣지&도우 - 석쇠 변경',
    pattern: '석쇠 변경',
    matchType: 'exact',
    category: '엣지&도우',
    groupName: '석쇠',
    detailName: '석쇠',
  },
  {
    ruleId: 'rule_edge_002',
    name: '엣지&도우 - 석쇠 선택',
    pattern: '석쇠 선택',
    matchType: 'exact',
    category: '엣지&도우',
    groupName: '석쇠',
    detailName: '석쇠',
  },
  {
    ruleId: 'rule_edge_003',
    name: '엣지&도우 - 석쇠 선택+할라피뇨쨈 선택',
    pattern: '석쇠 선택+할라피뇨쨈 선택',
    matchType: 'exact',
    category: '엣지&도우',
    groupName: '석쇠',
    detailName: '석쇠',
  },

  // 치즈크러스트 (3개)
  {
    ruleId: 'rule_edge_004',
    name: '엣지&도우 - 치즈 크러스트 추가',
    pattern: '치즈 크러스트 추가',
    matchType: 'exact',
    category: '엣지&도우',
    groupName: '치즈크러스트',
    detailName: '치즈크러스트',
  },
  {
    ruleId: 'rule_edge_005',
    name: '엣지&도우 - 치즈 크러스트 선택',
    pattern: '치즈 크러스트 선택',
    matchType: 'exact',
    category: '엣지&도우',
    groupName: '치즈크러스트',
    detailName: '치즈크러스트',
  },
  {
    ruleId: 'rule_edge_006',
    name: '엣지&도우 - 치즈 크러스트+할라피뇨쨈 선택',
    pattern: '치즈 크러스트+할라피뇨쨈 선택',
    matchType: 'exact',
    category: '엣지&도우',
    groupName: '치즈크러스트',
    detailName: '치즈크러스트',
  },

  // 골드스윗 (2개)
  {
    ruleId: 'rule_edge_007',
    name: '엣지&도우 - 골드스윗 크러스트 선택',
    pattern: '골드스윗 크러스트 선택',
    matchType: 'exact',
    category: '엣지&도우',
    groupName: '골드스윗',
    detailName: '골드스윗',
  },
  {
    ruleId: 'rule_edge_008',
    name: '엣지&도우 - 골드스윗 크러스트+할라피뇨쨈 선택',
    pattern: '골드스윗 크러스트+할라피뇨쨈 선택',
    matchType: 'exact',
    category: '엣지&도우',
    groupName: '골드스윗',
    detailName: '골드스윗',
  },

  // 씬바사삭 (2개)
  {
    ruleId: 'rule_edge_009',
    name: '엣지&도우 - 씬바사삭 선택',
    pattern: '씬바사삭 선택',
    matchType: 'exact',
    category: '엣지&도우',
    groupName: '씬바사삭',
    detailName: '씬바사삭',
  },
  {
    ruleId: 'rule_edge_010',
    name: '엣지&도우 - 씬바사삭 선택+할라피뇨쨈 선택',
    pattern: '씬바사삭 선택+할라피뇨쨈 선택',
    matchType: 'exact',
    category: '엣지&도우',
    groupName: '씬바사삭',
    detailName: '씬바사삭',
  },

  // ============================================================
  // 하프앤하프 카테고리 (2개)
  // ============================================================
  {
    ruleId: 'rule_half_001',
    name: '하프앤하프 L',
    pattern: '하프앤하프 피자 L',
    matchType: 'exact',
    category: '하프앤하프',
    groupName: '하프앤하프',
    detailName: '하프앤하프L',
  },
  {
    ruleId: 'rule_half_002',
    name: '하프앤하프 R',
    pattern: '하프앤하프 피자 R',
    matchType: 'exact',
    category: '하프앤하프',
    groupName: '하프앤하프',
    detailName: '하프앤하프R',
  },
];
