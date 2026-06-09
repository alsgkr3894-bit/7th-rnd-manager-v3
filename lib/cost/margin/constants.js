/**
 * 원가율·마진율 판정 기준 (단위: %)
 * 이 값을 바꾸면 MarginRow 색상, 통계 카드, 경고 뱃지가 동시에 반영됩니다.
 */
export const COST_RATE_THRESHOLD = {
  GOOD: 30, // 이하: 좋음 (초록)
  WARNING: 40, // 초과: 위험 (빨강)
};

export const MARGIN_RATE_THRESHOLD = {
  GOOD: 70, // 이상: 좋음
  WARNING: 60, // 미만: 위험
};
