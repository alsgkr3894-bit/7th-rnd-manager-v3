'use client';
import { useCountUp } from '@/hooks/useCountUp';

/**
 * 숫자만 다시 그리는 카운트업 — useCountUp은 프레임마다 상태를 바꾸므로 페이지 최상위에서
 * 쓰면 그 페이지의 모든 위젯이 1초 넘게 초당 60번 다시 그려진다. 이 컴포넌트로 숫자 한 조각만
 * 격리해서 쓴다.
 */
export function CountUp({ value, duration, delay, decimals, format }) {
  const current = useCountUp(value, { duration, delay, decimals });
  return format ? format(current) : current;
}
