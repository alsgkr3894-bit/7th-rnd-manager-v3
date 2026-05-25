/**
 * 메뉴판매량 확장 분류 규칙 (MS-9)
 *
 * 운영 메뉴 분류 규칙 모음. sales-classify-rules.js의 BASIC_RULES 다음 순위로 평가됨.
 * 정책: MENU_SALES_DETAILED_POLICY.md "메뉴 그룹 매핑 규칙" 참조
 *
 * 모든 pattern은 정규화 후 형식 (괄호 → 공백, 우괄호 제거).
 * 예: `새우파티 피자(L)` (원본) → `새우파티 피자 L` (pattern)
 */

const PIZZA_GROUPS_4 = ['7번가스페셜', '새우파티', '흥부박포테이토'];                       // L,R,기본,피자
const PIZZA_GROUPS_3 = ['페스티벌'];                                                      // L,R,기본
const PIZZA_GROUPS_5_VARIANT = ['샘스테이크'];                                            // L,R,기본,피자,변경
const PIZZA_GROUPS_5_FULL = ['체다골드포테이토','고구마','화이트쉬림프','칠리크림불갈비','불고기','포테이토','고르곤졸라','체다파인애플','컨츄리치킨']; // L,R,기본,피자,변경
const PIZZA_GROUPS_4_PEPE = ['페페로니'];                                                 // L,R,기본,변경,피자 (5개 - 페페로니 피자 포함)

function makePizzaRules(idStart) {
  const rules = [];
  let id = idStart;
  // 헬퍼: 6종 변형 패턴 생성 (선택 변형만 포함)
  return { rules, nextId: id };
}

export const MS9_RULES = [
  // ============================================================
  // 피자 카테고리 (103개)
  // 패턴: 정규화 후 (괄호 제거)
  // ============================================================

  // 7번가스페셜 (4)
  { ruleId: 'rule_pizza_010', name: '피자 - 7번가스페셜 L',  pattern: '7번가스페셜 피자 L', matchType: 'exact', category: '피자', groupName: '7번가스페셜', detailName: '7번가스페셜L' },
  { ruleId: 'rule_pizza_011', name: '피자 - 7번가스페셜 R',  pattern: '7번가스페셜 피자 R', matchType: 'exact', category: '피자', groupName: '7번가스페셜', detailName: '7번가스페셜R' },
  { ruleId: 'rule_pizza_012', name: '피자 - 7번가스페셜',     pattern: '7번가스페셜',         matchType: 'exact', category: '피자', groupName: '7번가스페셜', detailName: '7번가스페셜' },
  { ruleId: 'rule_pizza_013', name: '피자 - 7번가스페셜 피자', pattern: '7번가스페셜 피자',   matchType: 'exact', category: '피자', groupName: '7번가스페셜', detailName: '7번가스페셜' },

  // 샘스테이크 (5)
  { ruleId: 'rule_pizza_014', name: '피자 - 샘스테이크 L (피자)', pattern: '샘스테이크 피자 L', matchType: 'exact', category: '피자', groupName: '샘스테이크', detailName: '샘스테이크L' },
  { ruleId: 'rule_pizza_015', name: '피자 - 샘스테이크 R (피자)', pattern: '샘스테이크 피자 R', matchType: 'exact', category: '피자', groupName: '샘스테이크', detailName: '샘스테이크R' },
  { ruleId: 'rule_pizza_016', name: '피자 - 샘스테이크',         pattern: '샘스테이크',         matchType: 'exact', category: '피자', groupName: '샘스테이크', detailName: '샘스테이크' },
  { ruleId: 'rule_pizza_017', name: '피자 - 샘스테이크 피자',    pattern: '샘스테이크 피자',    matchType: 'exact', category: '피자', groupName: '샘스테이크', detailName: '샘스테이크' },
  { ruleId: 'rule_pizza_018', name: '피자 - 샘스테이크 변경',    pattern: '샘스테이크 변경',    matchType: 'exact', category: '피자', groupName: '샘스테이크', detailName: '샘스테이크' },

  // 체다골드포테이토 (5)
  { ruleId: 'rule_pizza_020', name: '피자 - 체다골드포테이토 L',   pattern: '체다골드포테이토 피자 L', matchType: 'exact', category: '피자', groupName: '체다골드포테이토', detailName: '체다골드포테이토L' },
  { ruleId: 'rule_pizza_021', name: '피자 - 체다골드포테이토 R',   pattern: '체다골드포테이토 피자 R', matchType: 'exact', category: '피자', groupName: '체다골드포테이토', detailName: '체다골드포테이토R' },
  { ruleId: 'rule_pizza_022', name: '피자 - 체다골드포테이토',     pattern: '체다골드포테이토',         matchType: 'exact', category: '피자', groupName: '체다골드포테이토', detailName: '체다골드포테이토' },
  { ruleId: 'rule_pizza_023', name: '피자 - 체다골드포테이토 피자', pattern: '체다골드포테이토 피자',   matchType: 'exact', category: '피자', groupName: '체다골드포테이토', detailName: '체다골드포테이토' },
  { ruleId: 'rule_pizza_024', name: '피자 - 체다골드포테이토 변경', pattern: '체다골드포테이토 변경',   matchType: 'exact', category: '피자', groupName: '체다골드포테이토', detailName: '체다골드포테이토' },

  // 새우파티 (4)
  { ruleId: 'rule_pizza_030', name: '피자 - 새우파티 L',   pattern: '새우파티 피자 L', matchType: 'exact', category: '피자', groupName: '새우파티', detailName: '새우파티L' },
  { ruleId: 'rule_pizza_031', name: '피자 - 새우파티 R',   pattern: '새우파티 피자 R', matchType: 'exact', category: '피자', groupName: '새우파티', detailName: '새우파티R' },
  { ruleId: 'rule_pizza_032', name: '피자 - 새우파티',     pattern: '새우파티',         matchType: 'exact', category: '피자', groupName: '새우파티', detailName: '새우파티' },
  { ruleId: 'rule_pizza_033', name: '피자 - 새우파티 피자', pattern: '새우파티 피자',   matchType: 'exact', category: '피자', groupName: '새우파티', detailName: '새우파티' },

  // 페스티벌 (3)
  { ruleId: 'rule_pizza_040', name: '피자 - 페스티벌 L', pattern: '페스티벌 피자 L', matchType: 'exact', category: '피자', groupName: '페스티벌', detailName: '페스티벌L' },
  { ruleId: 'rule_pizza_041', name: '피자 - 페스티벌 R', pattern: '페스티벌 피자 R', matchType: 'exact', category: '피자', groupName: '페스티벌', detailName: '페스티벌R' },
  { ruleId: 'rule_pizza_042', name: '피자 - 페스티벌',    pattern: '페스티벌',         matchType: 'exact', category: '피자', groupName: '페스티벌', detailName: '페스티벌' },

  // 고구마 (5)
  { ruleId: 'rule_pizza_050', name: '피자 - 고구마 L',   pattern: '고구마 피자 L', matchType: 'exact', category: '피자', groupName: '고구마', detailName: '고구마L' },
  { ruleId: 'rule_pizza_051', name: '피자 - 고구마 R',   pattern: '고구마 피자 R', matchType: 'exact', category: '피자', groupName: '고구마', detailName: '고구마R' },
  { ruleId: 'rule_pizza_052', name: '피자 - 고구마',     pattern: '고구마',         matchType: 'exact', category: '피자', groupName: '고구마', detailName: '고구마' },
  { ruleId: 'rule_pizza_053', name: '피자 - 고구마 피자', pattern: '고구마 피자',   matchType: 'exact', category: '피자', groupName: '고구마', detailName: '고구마' },
  { ruleId: 'rule_pizza_054', name: '피자 - 고구마 변경', pattern: '고구마 변경',   matchType: 'exact', category: '피자', groupName: '고구마', detailName: '고구마' },

  // 화이트쉬림프 (5)
  { ruleId: 'rule_pizza_060', name: '피자 - 화이트쉬림프 L',   pattern: '화이트쉬림프 피자 L', matchType: 'exact', category: '피자', groupName: '화이트쉬림프', detailName: '화이트쉬림프L' },
  { ruleId: 'rule_pizza_061', name: '피자 - 화이트쉬림프 R',   pattern: '화이트쉬림프 피자 R', matchType: 'exact', category: '피자', groupName: '화이트쉬림프', detailName: '화이트쉬림프R' },
  { ruleId: 'rule_pizza_062', name: '피자 - 화이트쉬림프',     pattern: '화이트쉬림프',         matchType: 'exact', category: '피자', groupName: '화이트쉬림프', detailName: '화이트쉬림프' },
  { ruleId: 'rule_pizza_063', name: '피자 - 화이트쉬림프 피자', pattern: '화이트쉬림프 피자',   matchType: 'exact', category: '피자', groupName: '화이트쉬림프', detailName: '화이트쉬림프' },
  { ruleId: 'rule_pizza_064', name: '피자 - 화이트쉬림프 변경', pattern: '화이트쉬림프 변경',   matchType: 'exact', category: '피자', groupName: '화이트쉬림프', detailName: '화이트쉬림프' },

  // 칠리크림불갈비 (5)
  { ruleId: 'rule_pizza_070', name: '피자 - 칠리크림불갈비 L',   pattern: '칠리크림불갈비 피자 L', matchType: 'exact', category: '피자', groupName: '칠리크림불갈비', detailName: '칠리크림불갈비L' },
  { ruleId: 'rule_pizza_071', name: '피자 - 칠리크림불갈비 R',   pattern: '칠리크림불갈비 피자 R', matchType: 'exact', category: '피자', groupName: '칠리크림불갈비', detailName: '칠리크림불갈비R' },
  { ruleId: 'rule_pizza_072', name: '피자 - 칠리크림불갈비',     pattern: '칠리크림불갈비',         matchType: 'exact', category: '피자', groupName: '칠리크림불갈비', detailName: '칠리크림불갈비' },
  { ruleId: 'rule_pizza_073', name: '피자 - 칠리크림불갈비 피자', pattern: '칠리크림불갈비 피자',   matchType: 'exact', category: '피자', groupName: '칠리크림불갈비', detailName: '칠리크림불갈비' },
  { ruleId: 'rule_pizza_074', name: '피자 - 칠리크림불갈비 변경', pattern: '칠리크림불갈비 변경',   matchType: 'exact', category: '피자', groupName: '칠리크림불갈비', detailName: '칠리크림불갈비' },

  // 레드핫그릴치킨 (5, BASIC_RULES rule_pizza_002가 "레드핫그릴치킨" 단독 담당)
  { ruleId: 'rule_pizza_080', name: '피자 - 레드핫그릴치킨 L',    pattern: '레드핫그릴치킨 피자 L', matchType: 'exact', category: '피자', groupName: '레드핫그릴치킨', detailName: '레드핫그릴치킨L' },
  { ruleId: 'rule_pizza_081', name: '피자 - 레드핫그릴치킨 R',    pattern: '레드핫그릴치킨 피자 R', matchType: 'exact', category: '피자', groupName: '레드핫그릴치킨', detailName: '레드핫그릴치킨R' },
  { ruleId: 'rule_pizza_082', name: '피자 - 레드핫그릴치킨 변경', pattern: '레드핫그릴치킨 변경',   matchType: 'exact', category: '피자', groupName: '레드핫그릴치킨', detailName: '레드핫그릴치킨' },
  { ruleId: 'rule_pizza_083', name: '피자 - 레드핫그릴 변경 (축약)', pattern: '레드핫그릴 변경',     matchType: 'exact', category: '피자', groupName: '레드핫그릴치킨', detailName: '레드핫그릴치킨' },
  { ruleId: 'rule_pizza_084', name: '피자 - 레드핫그릴 피자 (축약)', pattern: '레드핫그릴 피자',     matchType: 'exact', category: '피자', groupName: '레드핫그릴치킨', detailName: '레드핫그릴치킨' },

  // 흥부박포테이토 (4)
  { ruleId: 'rule_pizza_090', name: '피자 - 흥부박포테이토 L',   pattern: '흥부박포테이토 피자 L', matchType: 'exact', category: '피자', groupName: '흥부박포테이토', detailName: '흥부박포테이토L' },
  { ruleId: 'rule_pizza_091', name: '피자 - 흥부박포테이토 R',   pattern: '흥부박포테이토 피자 R', matchType: 'exact', category: '피자', groupName: '흥부박포테이토', detailName: '흥부박포테이토R' },
  { ruleId: 'rule_pizza_092', name: '피자 - 흥부박포테이토',     pattern: '흥부박포테이토',         matchType: 'exact', category: '피자', groupName: '흥부박포테이토', detailName: '흥부박포테이토' },
  { ruleId: 'rule_pizza_093', name: '피자 - 흥부박포테이토 피자', pattern: '흥부박포테이토 피자',   matchType: 'exact', category: '피자', groupName: '흥부박포테이토', detailName: '흥부박포테이토' },

  // 페페로니 (5, 페페로니 피자 포함)
  { ruleId: 'rule_pizza_100', name: '피자 - 페페로니 L',   pattern: '페페로니 피자 L', matchType: 'exact', category: '피자', groupName: '페페로니', detailName: '페페로니L' },
  { ruleId: 'rule_pizza_101', name: '피자 - 페페로니 R',   pattern: '페페로니 피자 R', matchType: 'exact', category: '피자', groupName: '페페로니', detailName: '페페로니R' },
  { ruleId: 'rule_pizza_102', name: '피자 - 페페로니',     pattern: '페페로니',         matchType: 'exact', category: '피자', groupName: '페페로니', detailName: '페페로니' },
  { ruleId: 'rule_pizza_103', name: '피자 - 페페로니 변경', pattern: '페페로니 변경',   matchType: 'exact', category: '피자', groupName: '페페로니', detailName: '페페로니' },
  { ruleId: 'rule_pizza_104', name: '피자 - 페페로니 피자', pattern: '페페로니 피자',   matchType: 'exact', category: '피자', groupName: '페페로니', detailName: '페페로니' },

  // 슈퍼콤비네이션 (5)
  { ruleId: 'rule_pizza_110', name: '피자 - 슈퍼콤비네이션 L',   pattern: '슈퍼콤비네이션 피자 L', matchType: 'exact', category: '피자', groupName: '슈퍼콤비네이션', detailName: '슈퍼콤비네이션L' },
  { ruleId: 'rule_pizza_111', name: '피자 - 슈퍼콤비네이션 R',   pattern: '슈퍼콤비네이션 피자 R', matchType: 'exact', category: '피자', groupName: '슈퍼콤비네이션', detailName: '슈퍼콤비네이션R' },
  { ruleId: 'rule_pizza_112', name: '피자 - 슈퍼콤비네이션',     pattern: '슈퍼콤비네이션',         matchType: 'exact', category: '피자', groupName: '슈퍼콤비네이션', detailName: '슈퍼콤비네이션' },
  { ruleId: 'rule_pizza_113', name: '피자 - 슈퍼콤비네이션 피자', pattern: '슈퍼콤비네이션 피자',   matchType: 'exact', category: '피자', groupName: '슈퍼콤비네이션', detailName: '슈퍼콤비네이션' },
  { ruleId: 'rule_pizza_114', name: '피자 - 슈퍼콤비네이션 선택', pattern: '슈퍼콤비네이션 선택',   matchType: 'exact', category: '피자', groupName: '슈퍼콤비네이션', detailName: '슈퍼콤비네이션' },

  // 불고기 (5)
  { ruleId: 'rule_pizza_120', name: '피자 - 불고기 L',   pattern: '불고기 피자 L', matchType: 'exact', category: '피자', groupName: '불고기', detailName: '불고기L' },
  { ruleId: 'rule_pizza_121', name: '피자 - 불고기 R',   pattern: '불고기 피자 R', matchType: 'exact', category: '피자', groupName: '불고기', detailName: '불고기R' },
  { ruleId: 'rule_pizza_122', name: '피자 - 불고기',     pattern: '불고기',         matchType: 'exact', category: '피자', groupName: '불고기', detailName: '불고기' },
  { ruleId: 'rule_pizza_123', name: '피자 - 불고기 피자', pattern: '불고기 피자',   matchType: 'exact', category: '피자', groupName: '불고기', detailName: '불고기' },
  { ruleId: 'rule_pizza_124', name: '피자 - 불고기 변경', pattern: '불고기 변경',   matchType: 'exact', category: '피자', groupName: '불고기', detailName: '불고기' },

  // 뉴더블치즈 (5, BASIC_RULES rule_pizza_001은 "뉴더블치즈피자" 단독)
  { ruleId: 'rule_pizza_130', name: '피자 - 뉴더블치즈 L',   pattern: '뉴더블치즈 피자 L', matchType: 'exact', category: '피자', groupName: '뉴더블치즈', detailName: '뉴더블치즈L' },
  { ruleId: 'rule_pizza_131', name: '피자 - 뉴더블치즈 R',   pattern: '뉴더블치즈 피자 R', matchType: 'exact', category: '피자', groupName: '뉴더블치즈', detailName: '뉴더블치즈R' },
  { ruleId: 'rule_pizza_132', name: '피자 - 뉴더블치즈',     pattern: '뉴더블치즈',         matchType: 'exact', category: '피자', groupName: '뉴더블치즈', detailName: '뉴더블치즈' },
  { ruleId: 'rule_pizza_133', name: '피자 - 뉴더블치즈 변경', pattern: '뉴더블치즈 변경',   matchType: 'exact', category: '피자', groupName: '뉴더블치즈', detailName: '뉴더블치즈' },
  { ruleId: 'rule_pizza_134', name: '피자 - 뉴더블 L (축약)', pattern: '뉴더블 피자 L',     matchType: 'exact', category: '피자', groupName: '뉴더블치즈', detailName: '뉴더블치즈L' },

  // 포테이토 (5)
  { ruleId: 'rule_pizza_140', name: '피자 - 포테이토 L',   pattern: '포테이토 피자 L', matchType: 'exact', category: '피자', groupName: '포테이토', detailName: '포테이토L' },
  { ruleId: 'rule_pizza_141', name: '피자 - 포테이토 R',   pattern: '포테이토 피자 R', matchType: 'exact', category: '피자', groupName: '포테이토', detailName: '포테이토R' },
  { ruleId: 'rule_pizza_142', name: '피자 - 포테이토',     pattern: '포테이토',         matchType: 'exact', category: '피자', groupName: '포테이토', detailName: '포테이토' },
  { ruleId: 'rule_pizza_143', name: '피자 - 포테이토 피자', pattern: '포테이토 피자',   matchType: 'exact', category: '피자', groupName: '포테이토', detailName: '포테이토' },
  { ruleId: 'rule_pizza_144', name: '피자 - 포테이토 변경', pattern: '포테이토 변경',   matchType: 'exact', category: '피자', groupName: '포테이토', detailName: '포테이토' },

  // 고르곤졸라 (5)
  { ruleId: 'rule_pizza_150', name: '피자 - 고르곤졸라 L',   pattern: '고르곤졸라 피자 L', matchType: 'exact', category: '피자', groupName: '고르곤졸라', detailName: '고르곤졸라L' },
  { ruleId: 'rule_pizza_151', name: '피자 - 고르곤졸라 R',   pattern: '고르곤졸라 피자 R', matchType: 'exact', category: '피자', groupName: '고르곤졸라', detailName: '고르곤졸라R' },
  { ruleId: 'rule_pizza_152', name: '피자 - 고르곤졸라',     pattern: '고르곤졸라',         matchType: 'exact', category: '피자', groupName: '고르곤졸라', detailName: '고르곤졸라' },
  { ruleId: 'rule_pizza_153', name: '피자 - 고르곤졸라 피자', pattern: '고르곤졸라 피자',   matchType: 'exact', category: '피자', groupName: '고르곤졸라', detailName: '고르곤졸라' },
  { ruleId: 'rule_pizza_154', name: '피자 - 고르곤졸라 변경', pattern: '고르곤졸라 변경',   matchType: 'exact', category: '피자', groupName: '고르곤졸라', detailName: '고르곤졸라' },

  // 체다파인애플 (5)
  { ruleId: 'rule_pizza_160', name: '피자 - 체다파인애플 L',   pattern: '체다파인애플 피자 L', matchType: 'exact', category: '피자', groupName: '체다파인애플', detailName: '체다파인애플L' },
  { ruleId: 'rule_pizza_161', name: '피자 - 체다파인애플 R',   pattern: '체다파인애플 피자 R', matchType: 'exact', category: '피자', groupName: '체다파인애플', detailName: '체다파인애플R' },
  { ruleId: 'rule_pizza_162', name: '피자 - 체다파인애플',     pattern: '체다파인애플',         matchType: 'exact', category: '피자', groupName: '체다파인애플', detailName: '체다파인애플' },
  { ruleId: 'rule_pizza_163', name: '피자 - 체다파인애플 피자', pattern: '체다파인애플 피자',   matchType: 'exact', category: '피자', groupName: '체다파인애플', detailName: '체다파인애플' },
  { ruleId: 'rule_pizza_164', name: '피자 - 체다파인애플 변경', pattern: '체다파인애플 변경',   matchType: 'exact', category: '피자', groupName: '체다파인애플', detailName: '체다파인애플' },

  // 컨츄리치킨 (5)
  { ruleId: 'rule_pizza_170', name: '피자 - 컨츄리치킨 L',   pattern: '컨츄리치킨 피자 L', matchType: 'exact', category: '피자', groupName: '컨츄리치킨', detailName: '컨츄리치킨L' },
  { ruleId: 'rule_pizza_171', name: '피자 - 컨츄리치킨 R',   pattern: '컨츄리치킨 피자 R', matchType: 'exact', category: '피자', groupName: '컨츄리치킨', detailName: '컨츄리치킨R' },
  { ruleId: 'rule_pizza_172', name: '피자 - 컨츄리치킨',     pattern: '컨츄리치킨',         matchType: 'exact', category: '피자', groupName: '컨츄리치킨', detailName: '컨츄리치킨' },
  { ruleId: 'rule_pizza_173', name: '피자 - 컨츄리치킨 피자', pattern: '컨츄리치킨 피자',   matchType: 'exact', category: '피자', groupName: '컨츄리치킨', detailName: '컨츄리치킨' },
  { ruleId: 'rule_pizza_174', name: '피자 - 컨츄리치킨 변경', pattern: '컨츄리치킨 변경',   matchType: 'exact', category: '피자', groupName: '컨츄리치킨', detailName: '컨츄리치킨' },

  // 고추장불고기 (12, 메뉴명 변경: 고추장버터불고기 → 고추장불고기, 양쪽 6개씩)
  // 구메뉴명
  { ruleId: 'rule_pizza_180', name: '피자 - 고추장버터불고기 L (구)', pattern: '고추장버터불고기 피자 L', matchType: 'exact', category: '피자', groupName: '고추장불고기', detailName: '고추장불고기L' },
  { ruleId: 'rule_pizza_181', name: '피자 - 고추장버터불고기 R (구)', pattern: '고추장버터불고기 피자 R', matchType: 'exact', category: '피자', groupName: '고추장불고기', detailName: '고추장불고기R' },
  { ruleId: 'rule_pizza_182', name: '피자 - 고추장버터불고기 (구)',   pattern: '고추장버터불고기',         matchType: 'exact', category: '피자', groupName: '고추장불고기', detailName: '고추장불고기' },
  { ruleId: 'rule_pizza_183', name: '피자 - 고추장버터불고기 피자 (구)', pattern: '고추장버터불고기 피자',   matchType: 'exact', category: '피자', groupName: '고추장불고기', detailName: '고추장불고기' },
  { ruleId: 'rule_pizza_184', name: '피자 - 고추장버터불고기 변경 (구)', pattern: '고추장버터불고기 변경',   matchType: 'exact', category: '피자', groupName: '고추장불고기', detailName: '고추장불고기' },
  { ruleId: 'rule_pizza_185', name: '피자 - 고추장버터불고기 추가 (구)', pattern: '고추장버터불고기 추가',   matchType: 'exact', category: '피자', groupName: '고추장불고기', detailName: '고추장불고기' },
  // 신메뉴명
  { ruleId: 'rule_pizza_186', name: '피자 - 고추장불고기 L',   pattern: '고추장불고기 피자 L', matchType: 'exact', category: '피자', groupName: '고추장불고기', detailName: '고추장불고기L' },
  { ruleId: 'rule_pizza_187', name: '피자 - 고추장불고기 R',   pattern: '고추장불고기 피자 R', matchType: 'exact', category: '피자', groupName: '고추장불고기', detailName: '고추장불고기R' },
  { ruleId: 'rule_pizza_188', name: '피자 - 고추장불고기',     pattern: '고추장불고기',         matchType: 'exact', category: '피자', groupName: '고추장불고기', detailName: '고추장불고기' },
  { ruleId: 'rule_pizza_189', name: '피자 - 고추장불고기 피자', pattern: '고추장불고기 피자',   matchType: 'exact', category: '피자', groupName: '고추장불고기', detailName: '고추장불고기' },
  { ruleId: 'rule_pizza_190', name: '피자 - 고추장불고기 변경', pattern: '고추장불고기 변경',   matchType: 'exact', category: '피자', groupName: '고추장불고기', detailName: '고추장불고기' },
  { ruleId: 'rule_pizza_191', name: '피자 - 고추장불고기 추가', pattern: '고추장불고기 추가',   matchType: 'exact', category: '피자', groupName: '고추장불고기', detailName: '고추장불고기' },

  // 까망베르더블치즈 (6, 신메뉴 사전 등록)
  { ruleId: 'rule_pizza_200', name: '피자 - 까망베르더블치즈 L',   pattern: '까망베르더블치즈 피자 L', matchType: 'exact', category: '피자', groupName: '까망베르더블치즈', detailName: '까망베르더블치즈L' },
  { ruleId: 'rule_pizza_201', name: '피자 - 까망베르더블치즈 R',   pattern: '까망베르더블치즈 피자 R', matchType: 'exact', category: '피자', groupName: '까망베르더블치즈', detailName: '까망베르더블치즈R' },
  { ruleId: 'rule_pizza_202', name: '피자 - 까망베르더블치즈',     pattern: '까망베르더블치즈',         matchType: 'exact', category: '피자', groupName: '까망베르더블치즈', detailName: '까망베르더블치즈' },
  { ruleId: 'rule_pizza_203', name: '피자 - 까망베르더블치즈 피자', pattern: '까망베르더블치즈 피자',   matchType: 'exact', category: '피자', groupName: '까망베르더블치즈', detailName: '까망베르더블치즈' },
  { ruleId: 'rule_pizza_204', name: '피자 - 까망베르더블치즈 변경', pattern: '까망베르더블치즈 변경',   matchType: 'exact', category: '피자', groupName: '까망베르더블치즈', detailName: '까망베르더블치즈' },
  { ruleId: 'rule_pizza_205', name: '피자 - 까망베르더블치즈 추가', pattern: '까망베르더블치즈 추가',   matchType: 'exact', category: '피자', groupName: '까망베르더블치즈', detailName: '까망베르더블치즈' },

  // ============================================================
  // 1인피자 카테고리 (11개, BASIC_RULES rule_personal_001 "더블치즈" 별도)
  // 페페로니/고르곤졸라는 피자 카테고리와 groupName 충돌 회피 위해 "(P)" 접미사 사용
  // ============================================================
  { ruleId: 'rule_personal_002', name: '1인피자 - 페페로니 P',         pattern: '페페로니 피자 P',         matchType: 'exact', category: '1인피자', groupName: '페페로니(P)', detailName: '페페로니(P)' },
  { ruleId: 'rule_personal_003', name: '1인피자 - 페페로니 P 추가',    pattern: '페페로니 피자 P 추가',    matchType: 'exact', category: '1인피자', groupName: '페페로니(P)', detailName: '페페로니(P)' },
  { ruleId: 'rule_personal_004', name: '1인피자 - 고르곤졸라 P',       pattern: '고르곤졸라 피자 P',       matchType: 'exact', category: '1인피자', groupName: '고르곤졸라(P)', detailName: '고르곤졸라(P)' },
  { ruleId: 'rule_personal_005', name: '1인피자 - 하와이안 P',         pattern: '하와이안 피자 P',         matchType: 'exact', category: '1인피자', groupName: '하와이안', detailName: '하와이안' },
  { ruleId: 'rule_personal_006', name: '1인피자 - 하와이안 P 추가',    pattern: '하와이안 피자 P 추가',    matchType: 'exact', category: '1인피자', groupName: '하와이안', detailName: '하와이안' },
  { ruleId: 'rule_personal_007', name: '1인피자 - 하와이안 피자',       pattern: '하와이안 피자',           matchType: 'exact', category: '1인피자', groupName: '하와이안', detailName: '하와이안' },
  { ruleId: 'rule_personal_008', name: '1인피자 - 더블치즈 P',         pattern: '더블치즈 피자 P',         matchType: 'exact', category: '1인피자', groupName: '더블치즈', detailName: '더블치즈' },
  { ruleId: 'rule_personal_009', name: '1인피자 - 더블치즈 피자',       pattern: '더블치즈 피자',           matchType: 'exact', category: '1인피자', groupName: '더블치즈', detailName: '더블치즈' },
  { ruleId: 'rule_personal_010', name: '1인피자 - 콤보치즈 P',         pattern: '콤보치즈 피자 P',         matchType: 'exact', category: '1인피자', groupName: '콤보치즈', detailName: '콤보치즈' },
  { ruleId: 'rule_personal_011', name: '1인피자 - 콤보치즈 P 추가',    pattern: '콤보치즈 피자 P 추가',    matchType: 'exact', category: '1인피자', groupName: '콤보치즈', detailName: '콤보치즈' },
  { ruleId: 'rule_personal_012', name: '1인피자 - 콤보치즈 피자',       pattern: '콤보치즈 피자',           matchType: 'exact', category: '1인피자', groupName: '콤보치즈', detailName: '콤보치즈' },

  // ============================================================
  // 사이드 카테고리 (26개) — 기존 적용
  // ============================================================

  // 오븐스파게티 그룹 (3개, BASIC_RULES rule_side_001이 "오븐스파게티" 단독 담당)
  { ruleId: 'rule_side_002', name: '사이드 - 오븐스파게티 선택', pattern: '오븐스파게티 선택', matchType: 'exact', category: '사이드', groupName: '오븐스파게티', detailName: '오븐스파게티' },
  { ruleId: 'rule_side_003', name: '사이드 - 오븐스파게티 변경', pattern: '오븐스파게티 변경', matchType: 'exact', category: '사이드', groupName: '오븐스파게티', detailName: '오븐스파게티' },
  { ruleId: 'rule_side_004', name: '사이드 - 오븐스파게티 추가', pattern: '오븐스파게티 추가', matchType: 'exact', category: '사이드', groupName: '오븐스파게티', detailName: '오븐스파게티' },

  // 로제스파게티 그룹 (3개)
  { ruleId: 'rule_side_005', name: '사이드 - 로제 스파게티', pattern: '로제 스파게티', matchType: 'exact', category: '사이드', groupName: '로제스파게티', detailName: '로제스파게티' },
  { ruleId: 'rule_side_006', name: '사이드 - 로제스파게티 변경', pattern: '로제스파게티 변경', matchType: 'exact', category: '사이드', groupName: '로제스파게티', detailName: '로제스파게티' },
  { ruleId: 'rule_side_007', name: '사이드 - 로제스파게티 선택', pattern: '로제스파게티 선택', matchType: 'exact', category: '사이드', groupName: '로제스파게티', detailName: '로제스파게티' },

  // 핫윙 그룹 (3개, 콘코울슬로 콤보는 classify 단계에서 콘코울슬로 그룹에 자동 추가됨)
  { ruleId: 'rule_side_008', name: '사이드 - 핫윙 4PCS', pattern: '핫윙 4PCS', matchType: 'exact', category: '사이드', groupName: '핫윙', detailName: '핫윙4pcs' },
  { ruleId: 'rule_side_009', name: '사이드 - 핫윙 20PCS', pattern: '핫윙 20PCS', matchType: 'exact', category: '사이드', groupName: '핫윙', detailName: '핫윙20pcs' },
  { ruleId: 'rule_side_010', name: '사이드 - 핫윙 4PCS+콘코울슬로', pattern: '핫윙 4PCS+콘코울슬로', matchType: 'exact', category: '사이드', groupName: '핫윙', detailName: '핫윙4pcs' },

  // 치킨바사삭 그룹 (6개)
  { ruleId: 'rule_side_011', name: '사이드 - 치킨 바사삭 12PCS', pattern: '치킨 바사삭 12PCS', matchType: 'exact', category: '사이드', groupName: '치킨바사삭', detailName: '치킨바사삭12pcs' },
  { ruleId: 'rule_side_012', name: '사이드 - 치킨 바사삭 6PCS', pattern: '치킨 바사삭 6PCS', matchType: 'exact', category: '사이드', groupName: '치킨바사삭', detailName: '치킨바사삭6pcs' },
  { ruleId: 'rule_side_013', name: '사이드 - 치킨 바사삭 6PCS+콘코울슬로', pattern: '치킨 바사삭 6PCS+콘코울슬로', matchType: 'exact', category: '사이드', groupName: '치킨바사삭', detailName: '치킨바사삭6pcs' },
  { ruleId: 'rule_side_014', name: '사이드 - 치킨 바사삭 12PCS+콘코울슬로', pattern: '치킨 바사삭 12PCS+콘코울슬로', matchType: 'exact', category: '사이드', groupName: '치킨바사삭', detailName: '치킨바사삭12pcs' },
  { ruleId: 'rule_side_015', name: '사이드 - 치킨 바사삭 12PCS 변경', pattern: '치킨 바사삭 12PCS 변경', matchType: 'exact', category: '사이드', groupName: '치킨바사삭', detailName: '치킨바사삭' },
  { ruleId: 'rule_side_016', name: '사이드 - 치킨 바사삭 6PCS 선택', pattern: '치킨 바사삭 6PCS 선택', matchType: 'exact', category: '사이드', groupName: '치킨바사삭', detailName: '치킨바사삭' },

  // 떡볶이 단일 그룹 (3개)
  { ruleId: 'rule_side_017', name: '사이드 - 오븐치즈 떡볶이', pattern: '오븐치즈 떡볶이', matchType: 'exact', category: '사이드', groupName: '오븐치즈떡볶이', detailName: '오븐치즈떡볶이' },
  { ruleId: 'rule_side_018', name: '사이드 - 페페로니 떡볶이', pattern: '페페로니 떡볶이', matchType: 'exact', category: '사이드', groupName: '페페로니떡볶이', detailName: '페페로니떡볶이' },
  { ruleId: 'rule_side_019', name: '사이드 - 체다골드포테이토 떡볶이', pattern: '체다골드포테이토 떡볶이', matchType: 'exact', category: '사이드', groupName: '체다골드포테이토떡볶이', detailName: '체다골드포테이토떡볶이' },

  // 단일 PCS 메뉴 (6개)
  { ruleId: 'rule_side_020', name: '사이드 - 그릴 닭다리살 3PCS', pattern: '그릴 닭다리살 3PCS', matchType: 'exact', category: '사이드', groupName: '그릴닭다리살', detailName: '그릴닭다리살3pcs' },
  { ruleId: 'rule_side_021', name: '사이드 - 흑미크림 찰치즈볼 5PCS', pattern: '흑미크림 찰치즈볼 5PCS', matchType: 'exact', category: '사이드', groupName: '흑미크림찰치즈볼', detailName: '흑미크림찰치즈볼5pcs' },
  { ruleId: 'rule_side_022', name: '사이드 - 케이준 치킨텐더 5PCS', pattern: '케이준 치킨텐더 5PCS', matchType: 'exact', category: '사이드', groupName: '케이준치킨텐더', detailName: '케이준치킨텐더5pcs' },
  { ruleId: 'rule_side_023', name: '사이드 - 통통 새우링 4PCS', pattern: '통통 새우링 4PCS', matchType: 'exact', category: '사이드', groupName: '통통새우링', detailName: '통통새우링4pcs' },
  { ruleId: 'rule_side_024', name: '사이드 - 롱츄러스 4PCS', pattern: '롱츄러스 4PCS', matchType: 'exact', category: '사이드', groupName: '롱츄러스', detailName: '롱츄러스4pcs' },
  { ruleId: 'rule_side_025', name: '사이드 - 골드 멘보샤 3PCS', pattern: '골드 멘보샤 3PCS', matchType: 'exact', category: '사이드', groupName: '골드멘보샤', detailName: '골드멘보샤3pcs' },

  // 단일 기타 메뉴 (3개)
  { ruleId: 'rule_side_026', name: '사이드 - 콘코울슬로', pattern: '콘코울슬로', matchType: 'exact', category: '사이드', groupName: '콘코울슬로', detailName: '콘코울슬로' },
  { ruleId: 'rule_side_027', name: '사이드 - 감자튀김', pattern: '감자튀김', matchType: 'exact', category: '사이드', groupName: '감자튀김', detailName: '감자튀김' },
  { ruleId: 'rule_side_028', name: '사이드 - 쉬림프아라비아따', pattern: '쉬림프아라비아따', matchType: 'exact', category: '사이드', groupName: '쉬림프아라비아따', detailName: '쉬림프아라비아따' },

  // ============================================================
  // 사이드(소스) 카테고리 (8개, BASIC_RULES rule_sauce_001 "파마산" 단독)
  // 파마산 그룹은 치즈가루/파마산 추가 통합
  // ============================================================
  { ruleId: 'rule_sauce_002', name: '사이드(소스) - 치즈가루 (파마산 통합)', pattern: '치즈가루',         matchType: 'exact', category: '사이드(소스)', groupName: '파마산',         detailName: '파마산' },
  { ruleId: 'rule_sauce_003', name: '사이드(소스) - 파마산 추가 (파마산 통합)', pattern: '파마산 추가', matchType: 'exact', category: '사이드(소스)', groupName: '파마산',         detailName: '파마산' },
  { ruleId: 'rule_sauce_004', name: '사이드(소스) - 피클',         pattern: '피클',         matchType: 'exact', category: '사이드(소스)', groupName: '피클',         detailName: '피클' },
  { ruleId: 'rule_sauce_005', name: '사이드(소스) - 갈릭디핑소스', pattern: '갈릭디핑소스', matchType: 'exact', category: '사이드(소스)', groupName: '갈릭디핑소스', detailName: '갈릭디핑소스' },
  { ruleId: 'rule_sauce_006', name: '사이드(소스) - 할라피뇨쨈',   pattern: '할라피뇨쨈',   matchType: 'exact', category: '사이드(소스)', groupName: '할라피뇨쨈',   detailName: '할라피뇨쨈' },
  { ruleId: 'rule_sauce_007', name: '사이드(소스) - 핫소스',       pattern: '핫소스',       matchType: 'exact', category: '사이드(소스)', groupName: '핫소스',       detailName: '핫소스' },
  { ruleId: 'rule_sauce_008', name: '사이드(소스) - 꿀',           pattern: '꿀',           matchType: 'exact', category: '사이드(소스)', groupName: '꿀',           detailName: '꿀' },
  { ruleId: 'rule_sauce_009', name: '사이드(소스) - 스위트칠리소스', pattern: '스위트칠리소스', matchType: 'exact', category: '사이드(소스)', groupName: '스위트칠리소스', detailName: '스위트칠리소스' },

  // ============================================================
  // 엣지&도우 카테고리 (10개)
  // ============================================================

  // 석쇠 (3개)
  { ruleId: 'rule_edge_001', name: '엣지&도우 - 석쇠 변경',                pattern: '석쇠 변경',                matchType: 'exact', category: '엣지&도우', groupName: '석쇠', detailName: '석쇠' },
  { ruleId: 'rule_edge_002', name: '엣지&도우 - 석쇠 선택',                pattern: '석쇠 선택',                matchType: 'exact', category: '엣지&도우', groupName: '석쇠', detailName: '석쇠' },
  { ruleId: 'rule_edge_003', name: '엣지&도우 - 석쇠 선택+할라피뇨쨈 선택', pattern: '석쇠 선택+할라피뇨쨈 선택', matchType: 'exact', category: '엣지&도우', groupName: '석쇠', detailName: '석쇠' },

  // 치즈크러스트 (3개)
  { ruleId: 'rule_edge_004', name: '엣지&도우 - 치즈 크러스트 추가',           pattern: '치즈 크러스트 추가',           matchType: 'exact', category: '엣지&도우', groupName: '치즈크러스트', detailName: '치즈크러스트' },
  { ruleId: 'rule_edge_005', name: '엣지&도우 - 치즈 크러스트 선택',           pattern: '치즈 크러스트 선택',           matchType: 'exact', category: '엣지&도우', groupName: '치즈크러스트', detailName: '치즈크러스트' },
  { ruleId: 'rule_edge_006', name: '엣지&도우 - 치즈 크러스트+할라피뇨쨈 선택', pattern: '치즈 크러스트+할라피뇨쨈 선택', matchType: 'exact', category: '엣지&도우', groupName: '치즈크러스트', detailName: '치즈크러스트' },

  // 골드스윗 (2개)
  { ruleId: 'rule_edge_007', name: '엣지&도우 - 골드스윗 크러스트 선택',           pattern: '골드스윗 크러스트 선택',           matchType: 'exact', category: '엣지&도우', groupName: '골드스윗', detailName: '골드스윗' },
  { ruleId: 'rule_edge_008', name: '엣지&도우 - 골드스윗 크러스트+할라피뇨쨈 선택', pattern: '골드스윗 크러스트+할라피뇨쨈 선택', matchType: 'exact', category: '엣지&도우', groupName: '골드스윗', detailName: '골드스윗' },

  // 씬바사삭 (2개)
  { ruleId: 'rule_edge_009', name: '엣지&도우 - 씬바사삭 선택',                pattern: '씬바사삭 선택',                matchType: 'exact', category: '엣지&도우', groupName: '씬바사삭', detailName: '씬바사삭' },
  { ruleId: 'rule_edge_010', name: '엣지&도우 - 씬바사삭 선택+할라피뇨쨈 선택', pattern: '씬바사삭 선택+할라피뇨쨈 선택', matchType: 'exact', category: '엣지&도우', groupName: '씬바사삭', detailName: '씬바사삭' },

  // ============================================================
  // 하프앤하프 카테고리 (2개)
  // ============================================================
  { ruleId: 'rule_half_001', name: '하프앤하프 L', pattern: '하프앤하프 피자 L', matchType: 'exact', category: '하프앤하프', groupName: '하프앤하프', detailName: '하프앤하프L' },
  { ruleId: 'rule_half_002', name: '하프앤하프 R', pattern: '하프앤하프 피자 R', matchType: 'exact', category: '하프앤하프', groupName: '하프앤하프', detailName: '하프앤하프R' },

  // ============================================================
  // 세트메뉴 카테고리 (26개)
  // 5개 그룹: 피자세트, 피크닉박스, 파티박스 (L/R), 피자+사이드세트, 1인피자세트
  // ============================================================

  // 피자세트 (L/R 단독, 2개)
  { ruleId: 'rule_set_001', name: '세트메뉴 - 피자세트 L', pattern: '피자 L세트', matchType: 'exact', category: '세트메뉴', groupName: '피자세트', detailName: '피자세트L' },
  { ruleId: 'rule_set_002', name: '세트메뉴 - 피자세트 R', pattern: '피자 R세트', matchType: 'exact', category: '세트메뉴', groupName: '피자세트', detailName: '피자세트R' },

  // 피크닉박스 (L/R 단독, 2개)
  { ruleId: 'rule_set_003', name: '세트메뉴 - 피크닉박스 L', pattern: '피크닉박스 L', matchType: 'exact', category: '세트메뉴', groupName: '피크닉박스', detailName: '피크닉박스L' },
  { ruleId: 'rule_set_004', name: '세트메뉴 - 피크닉박스 R', pattern: '피크닉박스 R', matchType: 'exact', category: '세트메뉴', groupName: '피크닉박스', detailName: '피크닉박스R' },

  // 파티박스 (L/R 단독, 2개)
  { ruleId: 'rule_set_005', name: '세트메뉴 - 파티박스 L', pattern: '파티박스 L', matchType: 'exact', category: '세트메뉴', groupName: '파티박스', detailName: '파티박스L' },
  { ruleId: 'rule_set_006', name: '세트메뉴 - 파티박스 R', pattern: '파티박스 R', matchType: 'exact', category: '세트메뉴', groupName: '파티박스', detailName: '파티박스R' },

  // 피자+스파게티 세트 (L/R/P 사이즈 + 1인피자 통합)
  { ruleId: 'rule_set_010', name: '세트메뉴 - 슈퍼콤비네이션 L+스파게티',      pattern: '슈퍼콤비네이션 피자 L+스파게티',      matchType: 'exact', category: '세트메뉴', groupName: '피자+스파게티 세트', detailName: '슈퍼콤비네이션L+스파게티' },
  { ruleId: 'rule_set_011', name: '세트메뉴 - 샘스테이크 L+스파게티',          pattern: '샘스테이크 피자 L+스파게티',          matchType: 'exact', category: '세트메뉴', groupName: '피자+스파게티 세트', detailName: '샘스테이크L+스파게티' },
  { ruleId: 'rule_set_012', name: '세트메뉴 - 체다골드포테이토 L+스파게티',    pattern: '체다골드포테이토 피자 L+스파게티',    matchType: 'exact', category: '세트메뉴', groupName: '피자+스파게티 세트', detailName: '체다골드포테이토L+스파게티' },
  { ruleId: 'rule_set_013', name: '세트메뉴 - 칠리크림불갈비 L+스파게티',      pattern: '칠리크림불갈비 피자 L+스파게티',      matchType: 'exact', category: '세트메뉴', groupName: '피자+스파게티 세트', detailName: '칠리크림불갈비L+스파게티' },
  { ruleId: 'rule_set_014', name: '세트메뉴 - 칠리크림불갈비 R+스파게티',      pattern: '칠리크림불갈비 피자 R+스파게티',      matchType: 'exact', category: '세트메뉴', groupName: '피자+스파게티 세트', detailName: '칠리크림불갈비R+스파게티' },
  { ruleId: 'rule_set_015', name: '세트메뉴 - 페페로니 L+스파게티',            pattern: '페페로니 피자 L+스파게티',            matchType: 'exact', category: '세트메뉴', groupName: '피자+스파게티 세트', detailName: '페페로니L+스파게티' },
  { ruleId: 'rule_set_016', name: '세트메뉴 - 고구마 L+스파게티',              pattern: '고구마 피자 L+스파게티',              matchType: 'exact', category: '세트메뉴', groupName: '피자+스파게티 세트', detailName: '고구마L+스파게티' },
  { ruleId: 'rule_set_017', name: '세트메뉴 - 오리지널 피자+스파게티',         pattern: '오리지널 피자+스파게티',              matchType: 'exact', category: '세트메뉴', groupName: '피자+스파게티 세트', detailName: '오리지널 피자+스파게티' },

  // 피자+떡볶이 세트
  { ruleId: 'rule_set_018', name: '세트메뉴 - 오리지널 피자+떡볶이',           pattern: '오리지널 피자+떡볶이',                matchType: 'exact', category: '세트메뉴', groupName: '피자+떡볶이 세트', detailName: '오리지널 피자+떡볶이' },

  // 피자+사이드 세트 (+치킨바사삭/+핫윙/+흑미크림 찰치즈볼)
  { ruleId: 'rule_set_019', name: '세트메뉴 - 오리지널 피자+치킨바사삭',       pattern: '오리지널 피자+치킨바사삭',            matchType: 'exact', category: '세트메뉴', groupName: '피자+사이드 세트', detailName: '오리지널 피자+치킨바사삭' },

  // 기타 (변경 명시 없음 - 별도 유지)
  { ruleId: 'rule_set_020', name: '세트메뉴 - 스파게티+사이드 세트',           pattern: '스파게티+사이드 세트',                matchType: 'exact', category: '세트메뉴', groupName: '스파게티+사이드 세트', detailName: '스파게티+사이드 세트' },

  // 1인피자(P) + 스파게티 → 1인피자 세트
  { ruleId: 'rule_set_030', name: '세트메뉴 - 더블치즈 P+스파게티',            pattern: '더블치즈 피자 P+스파게티',           matchType: 'exact', category: '세트메뉴', groupName: '1인피자 세트', detailName: '더블치즈P+스파게티' },
  { ruleId: 'rule_set_031', name: '세트메뉴 - 페페로니 P+스파게티',            pattern: '페페로니 피자 P+스파게티',           matchType: 'exact', category: '세트메뉴', groupName: '1인피자 세트', detailName: '페페로니P+스파게티' },
  { ruleId: 'rule_set_032', name: '세트메뉴 - 고르곤졸라 P+스파게티',          pattern: '고르곤졸라 피자 P+스파게티',         matchType: 'exact', category: '세트메뉴', groupName: '1인피자 세트', detailName: '고르곤졸라P+스파게티' },
  { ruleId: 'rule_set_034', name: '세트메뉴 - 1인 피자+스파게티 세트',         pattern: '1인 피자+스파게티 세트',              matchType: 'exact', category: '세트메뉴', groupName: '1인피자 세트', detailName: '1인 피자+스파게티 세트' },
  { ruleId: 'rule_set_035', name: '세트메뉴 - 1인 반반 피자+스파게티 세트',    pattern: '1인 반반 피자+스파게티 세트',         matchType: 'exact', category: '세트메뉴', groupName: '1인피자 세트', detailName: '1인 반반 피자+스파게티 세트' },

  // 1인피자 + 떡볶이/사이드
  { ruleId: 'rule_set_038', name: '세트메뉴 - 하와이안 P+떡볶이',              pattern: '하와이안 피자 P+떡볶이',              matchType: 'exact', category: '세트메뉴', groupName: '피자+떡볶이 세트', detailName: '하와이안P+떡볶이' },
  { ruleId: 'rule_set_036', name: '세트메뉴 - 1인 피자+핫윙 세트',             pattern: '1인 피자+핫윙 세트',                  matchType: 'exact', category: '세트메뉴', groupName: '피자+사이드 세트', detailName: '1인 피자+핫윙 세트' },
  { ruleId: 'rule_set_037', name: '세트메뉴 - 더블치즈 P+흑미크림 찰치즈볼',   pattern: '더블치즈 피자 P+흑미크림 찰치즈볼',   matchType: 'exact', category: '세트메뉴', groupName: '피자+사이드 세트', detailName: '더블치즈P+흑미크림 찰치즈볼' },

  // 1인 피자 세트 (단일)
  { ruleId: 'rule_set_033', name: '세트메뉴 - 1인 피자 세트',                  pattern: '1인 피자 세트',                       matchType: 'exact', category: '세트메뉴', groupName: '1인피자 세트', detailName: '1인 피자 세트' },

  // ============================================================
  // 추가토핑 카테고리 (19개)
  // 각 토핑은 독립 그룹. groupName은 "{토핑명} 추가" 형식
  // ============================================================
  { ruleId: 'rule_topping_001', name: '추가토핑 - 치즈 추가',         pattern: '치즈 추가',         matchType: 'exact', category: '추가토핑', groupName: '치즈 추가',         detailName: '치즈 추가' },
  { ruleId: 'rule_topping_002', name: '추가토핑 - 파인애플 추가',     pattern: '파인애플 추가',     matchType: 'exact', category: '추가토핑', groupName: '파인애플 추가',     detailName: '파인애플 추가' },
  { ruleId: 'rule_topping_003', name: '추가토핑 - 페페로니 추가',     pattern: '페페로니 추가',     matchType: 'exact', category: '추가토핑', groupName: '페페로니 추가',     detailName: '페페로니 추가' },
  { ruleId: 'rule_topping_004', name: '추가토핑 - 베이컨 추가',       pattern: '베이컨 추가',       matchType: 'exact', category: '추가토핑', groupName: '베이컨 추가',       detailName: '베이컨 추가' },
  { ruleId: 'rule_topping_005', name: '추가토핑 - 올리브 추가',       pattern: '올리브 추가',       matchType: 'exact', category: '추가토핑', groupName: '올리브 추가',       detailName: '올리브 추가' },
  { ruleId: 'rule_topping_006', name: '추가토핑 - 버섯 추가',         pattern: '버섯 추가',         matchType: 'exact', category: '추가토핑', groupName: '버섯 추가',         detailName: '버섯 추가' },
  { ruleId: 'rule_topping_007', name: '추가토핑 - 양파 추가',         pattern: '양파 추가',         matchType: 'exact', category: '추가토핑', groupName: '양파 추가',         detailName: '양파 추가' },
  { ruleId: 'rule_topping_008', name: '추가토핑 - 고구마무스 추가',   pattern: '고구마무스 추가',   matchType: 'exact', category: '추가토핑', groupName: '고구마무스 추가',   detailName: '고구마무스 추가' },
  { ruleId: 'rule_topping_009', name: '추가토핑 - 피망 추가',         pattern: '피망 추가',         matchType: 'exact', category: '추가토핑', groupName: '피망 추가',         detailName: '피망 추가' },
  { ruleId: 'rule_topping_010', name: '추가토핑 - 할라피뇨 추가',     pattern: '할라피뇨 추가',     matchType: 'exact', category: '추가토핑', groupName: '할라피뇨 추가',     detailName: '할라피뇨 추가' },
  { ruleId: 'rule_topping_011', name: '추가토핑 - 브로콜리 추가',     pattern: '브로콜리 추가',     matchType: 'exact', category: '추가토핑', groupName: '브로콜리 추가',     detailName: '브로콜리 추가' },
  { ruleId: 'rule_topping_012', name: '추가토핑 - 불고기 추가',       pattern: '불고기 추가',       matchType: 'exact', category: '추가토핑', groupName: '불고기 추가',       detailName: '불고기 추가' },
  { ruleId: 'rule_topping_013', name: '추가토핑 - 컨츄리 치킨 추가',  pattern: '컨츄리 치킨 추가',  matchType: 'exact', category: '추가토핑', groupName: '컨츄리 치킨 추가',  detailName: '컨츄리 치킨 추가' },
  { ruleId: 'rule_topping_014', name: '추가토핑 - 옥수수 추가',       pattern: '옥수수 추가',       matchType: 'exact', category: '추가토핑', groupName: '옥수수 추가',       detailName: '옥수수 추가' },
  { ruleId: 'rule_topping_015', name: '추가토핑 - 세블락소시지 추가', pattern: '세블락소시지 추가', matchType: 'exact', category: '추가토핑', groupName: '세블락소시지 추가', detailName: '세블락소시지 추가' },
  { ruleId: 'rule_topping_016', name: '추가토핑 - 새우 추가',         pattern: '새우 추가',         matchType: 'exact', category: '추가토핑', groupName: '새우 추가',         detailName: '새우 추가' },
  { ruleId: 'rule_topping_017', name: '추가토핑 - 웨지감자 추가',     pattern: '웨지감자 추가',     matchType: 'exact', category: '추가토핑', groupName: '웨지감자 추가',     detailName: '웨지감자 추가' },
  { ruleId: 'rule_topping_018', name: '추가토핑 - 불갈비 추가',       pattern: '불갈비 추가',       matchType: 'exact', category: '추가토핑', groupName: '불갈비 추가',       detailName: '불갈비 추가' },
  { ruleId: 'rule_topping_019', name: '추가토핑 - 마요네즈 추가',     pattern: '마요네즈 추가',     matchType: 'exact', category: '추가토핑', groupName: '마요네즈 추가',     detailName: '마요네즈 추가' },
  { ruleId: 'rule_topping_020', name: '추가토핑 - 마요네즈30g추가 (마요네즈 통합)', pattern: '마요네즈30g추가', matchType: 'exact', category: '추가토핑', groupName: '마요네즈 추가', detailName: '마요네즈 추가' },
  { ruleId: 'rule_topping_021', name: '추가토핑 - 고구마90g추가 (고구마무스 통합)', pattern: '고구마90g추가', matchType: 'exact', category: '추가토핑', groupName: '고구마무스 추가', detailName: '고구마무스 추가' },

  // ============================================================
  // 음료 카테고리 (5개, BASIC_RULES rule_drink_001 "콜라" 별도)
  // 각 음료는 별도 그룹으로 표시
  // ============================================================
  { ruleId: 'rule_drink_002', name: '음료 - 사이다',     pattern: '사이다',     matchType: 'exact', category: '음료', groupName: '사이다',     detailName: '사이다' },
  { ruleId: 'rule_drink_003', name: '음료 - 맥주',       pattern: '맥주',       matchType: 'exact', category: '음료', groupName: '맥주',       detailName: '맥주' },
  { ruleId: 'rule_drink_004', name: '음료 - 소주',       pattern: '소주',       matchType: 'exact', category: '음료', groupName: '소주',       detailName: '소주' },
  { ruleId: 'rule_drink_005', name: '음료 - 기타 음료', pattern: '기타 음료', matchType: 'exact', category: '음료', groupName: '기타 음료', detailName: '기타 음료' },
  { ruleId: 'rule_drink_006', name: '음료 - 기타 주류', pattern: '기타 주류', matchType: 'exact', category: '음료', groupName: '기타 주류', detailName: '기타 주류' },

  // ============================================================
  // 품목제외 카테고리 (20개)
  // status-classifier에서 category === '품목제외' 매칭 시 자동 excluded 처리
  // ============================================================
  { ruleId: 'rule_excluded_001', name: '품목제외 - 배달비', pattern: '배달비', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '배달비' },
  { ruleId: 'rule_excluded_002', name: '품목제외 - 추가 금액', pattern: '추가 금액', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '추가 금액' },
  { ruleId: 'rule_excluded_003', name: '품목제외 - 본사 권장 외 메뉴', pattern: '본사 권장 외 메뉴', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '본사 권장 외 메뉴' },
  { ruleId: 'rule_excluded_004', name: '품목제외 - 기타', pattern: '기타', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '기타' },
  { ruleId: 'rule_excluded_005', name: '품목제외 - 포장', pattern: '포장', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '포장' },
  { ruleId: 'rule_excluded_006', name: '품목제외 - 일회용품', pattern: '일회용품', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '일회용품' },
  { ruleId: 'rule_excluded_007', name: '품목제외 - 리뷰이벤트', pattern: '리뷰이벤트', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '리뷰이벤트' },
  { ruleId: 'rule_excluded_008', name: '품목제외 - 사장님 금액 할인', pattern: '사장님 금액 할인', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '사장님 금액 할인' },
  { ruleId: 'rule_excluded_009', name: '품목제외 - 쿠폰/할인', pattern: '쿠폰/할인', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '쿠폰/할인' },
  { ruleId: 'rule_excluded_010', name: '품목제외 - 갈릭디핑/핫소스 포함', pattern: '갈릭디핑/핫소스 포함', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '갈릭디핑/핫소스 포함' },
  { ruleId: 'rule_excluded_011', name: '품목제외 - 스파게티 사이즈업', pattern: '스파게티 사이즈업', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '스파게티 사이즈업' },
  { ruleId: 'rule_excluded_012', name: '품목제외 - 피클/갈릭디핑소스/핫소스 제외', pattern: '피클/갈릭디핑소스/핫소스 제외', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '피클/갈릭디핑소스/핫소스 제외' },
  { ruleId: 'rule_excluded_013', name: '품목제외 - 갈릭디핑/핫소스 제외', pattern: '갈릭디핑/핫소스 제외', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '갈릭디핑/핫소스 제외' },
  { ruleId: 'rule_excluded_014', name: '품목제외 - 피클 제외', pattern: '피클 제외', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '피클 제외' },
  { ruleId: 'rule_excluded_015', name: '품목제외 - 핫소스 제외', pattern: '핫소스 제외', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '핫소스 제외' },
  { ruleId: 'rule_excluded_016', name: '품목제외 - 갈릭디핑소스 제외', pattern: '갈릭디핑소스 제외', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '갈릭디핑소스 제외' },
  { ruleId: 'rule_excluded_017', name: '품목제외 - 피클/갈릭디핑소스 포함', pattern: '피클/갈릭디핑소스 포함', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '피클/갈릭디핑소스 포함' },
  { ruleId: 'rule_excluded_018', name: '품목제외 - 파마산 제외', pattern: '파마산 제외', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '파마산 제외' },
  { ruleId: 'rule_excluded_019', name: '품목제외 - 피클/핫소스 제외', pattern: '피클/핫소스 제외', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '피클/핫소스 제외' },
  { ruleId: 'rule_excluded_020', name: '품목제외 - 피클/갈릭디핑소스/핫소스 포함', pattern: '피클/갈릭디핑소스/핫소스 포함', matchType: 'exact', category: '품목제외', groupName: '품목제외', detailName: '피클/갈릭디핑소스/핫소스 포함' },
];
