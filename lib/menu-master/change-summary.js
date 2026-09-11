/**
 * lib/menu-master/change-summary.js — 메뉴마스터 저장 결과를 자동 일지 한 줄 요약으로 변환.
 * 순수 함수. logWork(type, summary)의 summary(80자 제한)에 그대로 넣는다.
 */
import { formatNumber } from '@/lib/format';

/**
 * @param {{menuName:string, price:number|null}|null} prev  - upsertMenuMaster 결과의 previous(update일 때만)
 * @param {{menuName:string, price:number|null}} next        - 저장 직후 폼 데이터 기준 현재 값
 * @param {'insert'|'update'} mode
 * @returns {string}
 */
export function summarizeMenuMasterChange(prev, next, mode) {
  const name = (next?.menuName || '').trim() || '메뉴';
  if (mode === 'insert' || !prev) return `등록: ${name}`;

  const prevName = (prev.menuName || '').trim();
  const nextName = (next?.menuName || '').trim();
  const nameChanged = prevName && nextName && prevName !== nextName;
  const priceChanged =
    prev.price != null && next?.price != null && Number(prev.price) !== Number(next.price);

  if (priceChanged) {
    return `판매가 ${formatNumber(prev.price)}→${formatNumber(next.price)}: ${nextName || name}`;
  }
  if (nameChanged) {
    return `이름 변경: ${prevName}→${nextName}`;
  }
  return `수정: ${name}`;
}
