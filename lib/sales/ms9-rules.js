/**
 * 메뉴판매량 확장 분류 규칙 (MS-9) — re-export 배럴
 *
 * 카테고리별 파일에서 불러와 하나의 배열로 합칩니다.
 * 순서: 피자·1인피자 → 사이드·소스·토핑·음료·품목제외 → 엣지&도우·하프앤하프 → 세트메뉴
 */

import { MS9_RULES_PIZZA } from './rules-pizza.js';
import { MS9_RULES_SIDE } from './rules-side.js';
import { MS9_RULES_EDGE } from './rules-edge.js';
import { MS9_RULES_SET } from './rules-set.js';

export const MS9_RULES = [
  ...MS9_RULES_PIZZA,
  ...MS9_RULES_SIDE,
  ...MS9_RULES_EDGE,
  ...MS9_RULES_SET,
];
