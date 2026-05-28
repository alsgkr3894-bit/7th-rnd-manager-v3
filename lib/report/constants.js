/**
 * lib/report/constants.js
 * 보고서 종류별 메타데이터 단일 정의 — COLOR, CHIP, TITLE, HREF 등 파생 가능
 */

export const KIND_META = {
  sales: {
    id:    'sales',
    title: '판매량 보고서',
    sub:   '월/년 단위 메뉴 판매량 + 카테고리별 비중 + 전월 대비 증감.',
    color: '#3182F6',
    icon:  'chart',
    emoji: '📊',
    href:  '/report/sales',
    chip:  { bg: 'var(--accent-soft)',    color: 'var(--accent-text)', label: '판매량' },
  },
  price: {
    id:    'price',
    title: '제때 가격 보고서',
    sub:   '제때 단가 변동 — 인상·인하 품목, 원가 영향, 추세.',
    color: '#E1101F',
    icon:  'alert',
    emoji: '💹',
    href:  '/report/price',
    chip:  { bg: 'var(--negative-soft)', color: 'var(--negative)', label: '가격' },
  },
  shipment: {
    id:    'shipment',
    title: '제때 출고량 보고서',
    sub:   '범용/관리품목 출고량 추세와 카테고리별 합계.',
    color: '#1D766F',
    icon:  'box',
    emoji: '📦',
    href:  '/report/shipment',
    chip:  { bg: 'var(--positive-soft)', color: 'var(--positive)', label: '출고량' },
  },
  compare: {
    id:    'compare',
    title: '판매량 비교 보고서',
    sub:   '두 기간을 나란히 — 메뉴·카테고리·금액 단위로 비교.',
    color: '#7C3AED',
    icon:  'calc',
    emoji: '⚖️',
    href:  '/report/menu-sales-compare',
    chip:  { bg: '#F0EBFF', color: '#6B3FCB', label: '비교' },
  },
  cost: {
    id:    'cost',
    title: '원가계산 보고서',
    sub:   '5개 카테고리 종합 원가표를 한 장에 — 평균 원가율·위험 메뉴.',
    color: '#F59E0B',
    icon:  'calc',
    emoji: '🧮',
    href:  '/report/cost',
    chip:  { bg: 'var(--warn-soft)', color: 'var(--warn)', label: '원가' },
  },
};

/** KIND_META에서 파생 — 각 파일에서 개별 선언 없이 사용 */
export const KIND_CHIP  = Object.fromEntries(Object.entries(KIND_META).map(([k, v]) => [k, v.chip]));
export const KIND_COLOR = Object.fromEntries(Object.entries(KIND_META).map(([k, v]) => [k, v.color]));
export const KIND_LABEL = Object.fromEntries(Object.entries(KIND_META).map(([k, v]) => [k, v.chip.label]));
export const KIND_EMOJI = Object.fromEntries(Object.entries(KIND_META).map(([k, v]) => [k, v.emoji]));
