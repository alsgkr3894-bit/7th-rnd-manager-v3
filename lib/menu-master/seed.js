/**
 * lib/menu-master/seed.js — 7번가 메뉴 코드 체계 기본 데이터
 *
 * 코드 구조: {대분류}-{중분류}-{번호}-{사이즈}
 *   P-PS-001-L   피자 / 프리미엄 스페셜 / 001 / L
 *   P-ONE-001    1인피자 / 씬도우 전용 / 001 (사이즈 접미사 없음)
 *   SET-FAM-001-L  세트박스 / 패밀리박스 / 001 / L
 *
 * 대분류 코드: P(피자), SET(세트박스)
 * 중분류 코드: PS(프리미엄 스페셜), PR(프리미엄), OR(오리지널),
 *              HH(하프앤하프), ONE(1인피자), FAM(패밀리박스)
 */

import { upsertMenuMaster } from './store';
import { getDefaultPrice } from '@/lib/cost/menu-price';
import { getActiveBrandId } from '@/lib/active-brand';

/* ── 원시 데이터 ─────────────────────────────────────────────── */

const SEED_ENTRIES = [
  // ── 프리미엄 스페셜 (P-PS) ────────────────────────────────────
  { menuCode: 'P-PS-001-R', category: '피자', subCategory: '프리미엄 스페셜', menuName: '샘스테이크 피자',      size: 'R', displayOrder: 1010 },
  { menuCode: 'P-PS-001-L', category: '피자', subCategory: '프리미엄 스페셜', menuName: '샘스테이크 피자',      size: 'L', displayOrder: 1011 },
  { menuCode: 'P-PS-002-R', category: '피자', subCategory: '프리미엄 스페셜', menuName: '체다골드포테이토 피자', size: 'R', displayOrder: 1020 },
  { menuCode: 'P-PS-002-L', category: '피자', subCategory: '프리미엄 스페셜', menuName: '체다골드포테이토 피자', size: 'L', displayOrder: 1021 },
  { menuCode: 'P-PS-003-R', category: '피자', subCategory: '프리미엄 스페셜', menuName: '7번가스페셜 피자',      size: 'R', displayOrder: 1030 },
  { menuCode: 'P-PS-003-L', category: '피자', subCategory: '프리미엄 스페셜', menuName: '7번가스페셜 피자',      size: 'L', displayOrder: 1031 },
  { menuCode: 'P-PS-004-R', category: '피자', subCategory: '프리미엄 스페셜', menuName: '새우파티 피자',         size: 'R', displayOrder: 1040 },
  { menuCode: 'P-PS-004-L', category: '피자', subCategory: '프리미엄 스페셜', menuName: '새우파티 피자',         size: 'L', displayOrder: 1041 },

  // ── 프리미엄 (P-PR) ───────────────────────────────────────────
  { menuCode: 'P-PR-001-R', category: '피자', subCategory: '프리미엄', menuName: '고구마 피자',         size: 'R', displayOrder: 2010 },
  { menuCode: 'P-PR-001-L', category: '피자', subCategory: '프리미엄', menuName: '고구마 피자',         size: 'L', displayOrder: 2011 },
  { menuCode: 'P-PR-002-R', category: '피자', subCategory: '프리미엄', menuName: '화이트쉬림프 피자',   size: 'R', displayOrder: 2020 },
  { menuCode: 'P-PR-002-L', category: '피자', subCategory: '프리미엄', menuName: '화이트쉬림프 피자',   size: 'L', displayOrder: 2021 },
  { menuCode: 'P-PR-003-R', category: '피자', subCategory: '프리미엄', menuName: '흥부박포테이토 피자', size: 'R', displayOrder: 2030 },
  { menuCode: 'P-PR-003-L', category: '피자', subCategory: '프리미엄', menuName: '흥부박포테이토 피자', size: 'L', displayOrder: 2031 },

  // ── 오리지널 (P-OR) ───────────────────────────────────────────
  { menuCode: 'P-OR-001-R', category: '피자', subCategory: '오리지널', menuName: '까망베르더블치즈 피자', size: 'R', displayOrder: 3010 },
  { menuCode: 'P-OR-001-L', category: '피자', subCategory: '오리지널', menuName: '까망베르더블치즈 피자', size: 'L', displayOrder: 3011 },
  { menuCode: 'P-OR-002-R', category: '피자', subCategory: '오리지널', menuName: '포테이토 피자',         size: 'R', displayOrder: 3020 },
  { menuCode: 'P-OR-002-L', category: '피자', subCategory: '오리지널', menuName: '포테이토 피자',         size: 'L', displayOrder: 3021 },
  { menuCode: 'P-OR-003-R', category: '피자', subCategory: '오리지널', menuName: '컨츄리치킨 피자',       size: 'R', displayOrder: 3030 },
  { menuCode: 'P-OR-003-L', category: '피자', subCategory: '오리지널', menuName: '컨츄리치킨 피자',       size: 'L', displayOrder: 3031 },
  { menuCode: 'P-OR-004-R', category: '피자', subCategory: '오리지널', menuName: '고추장불고기 피자',     size: 'R', displayOrder: 3040 },
  { menuCode: 'P-OR-004-L', category: '피자', subCategory: '오리지널', menuName: '고추장불고기 피자',     size: 'L', displayOrder: 3041 },
  { menuCode: 'P-OR-005-R', category: '피자', subCategory: '오리지널', menuName: '슈퍼콤비네이션 피자',   size: 'R', displayOrder: 3050 },
  { menuCode: 'P-OR-005-L', category: '피자', subCategory: '오리지널', menuName: '슈퍼콤비네이션 피자',   size: 'L', displayOrder: 3051 },
  { menuCode: 'P-OR-006-R', category: '피자', subCategory: '오리지널', menuName: '페페로니 피자',         size: 'R', displayOrder: 3060 },
  { menuCode: 'P-OR-006-L', category: '피자', subCategory: '오리지널', menuName: '페페로니 피자',         size: 'L', displayOrder: 3061 },
  { menuCode: 'P-OR-007-R', category: '피자', subCategory: '오리지널', menuName: '불고기 피자',           size: 'R', displayOrder: 3070 },
  { menuCode: 'P-OR-007-L', category: '피자', subCategory: '오리지널', menuName: '불고기 피자',           size: 'L', displayOrder: 3071 },
  { menuCode: 'P-OR-008-R', category: '피자', subCategory: '오리지널', menuName: '체다파인애플 피자',     size: 'R', displayOrder: 3080 },
  { menuCode: 'P-OR-008-L', category: '피자', subCategory: '오리지널', menuName: '체다파인애플 피자',     size: 'L', displayOrder: 3081 },
  { menuCode: 'P-OR-009-R', category: '피자', subCategory: '오리지널', menuName: '고르곤졸라 피자',       size: 'R', displayOrder: 3090 },
  { menuCode: 'P-OR-009-L', category: '피자', subCategory: '오리지널', menuName: '고르곤졸라 피자',       size: 'L', displayOrder: 3091 },

  // ── 하프앤하프 (P-HH) ─────────────────────────────────────────
  // 선택 메뉴는 별도 컬럼(halfMenu1/halfMenu2)으로 관리 — 여기선 대표 코드만 등록
  { menuCode: 'P-HH-001-R', category: '피자', subCategory: '하프앤하프', menuName: '하프앤하프 피자', size: 'R', displayOrder: 4010 },
  { menuCode: 'P-HH-001-L', category: '피자', subCategory: '하프앤하프', menuName: '하프앤하프 피자', size: 'L', displayOrder: 4011 },

  // ── 1인피자 (P-ONE) ───────────────────────────────────────────
  { menuCode: 'P-ONE-001', category: '1인피자', subCategory: '씬도우 전용', menuName: '하와이안 피자',   size: null, displayOrder: 5010 },
  { menuCode: 'P-ONE-002', category: '1인피자', subCategory: '씬도우 전용', menuName: '페페로니 피자',   size: null, displayOrder: 5020 },
  { menuCode: 'P-ONE-003', category: '1인피자', subCategory: '씬도우 전용', menuName: '더블치즈 피자',   size: null, displayOrder: 5030 },
  { menuCode: 'P-ONE-004', category: '1인피자', subCategory: '씬도우 전용', menuName: '고르곤졸라 피자', size: null, displayOrder: 5040 },

  // ── 세트박스 (SET-FAM) ────────────────────────────────────────
  { menuCode: 'SET-FAM-001-L', category: '세트박스', subCategory: '패밀리박스', menuName: '패밀리박스', size: 'L', price: 39900, displayOrder: 6010 },
  { menuCode: 'SET-FAM-001-R', category: '세트박스', subCategory: '패밀리박스', menuName: '패밀리박스', size: 'R', price: 33900, displayOrder: 6011 },

  // ── 사이드 — 스파게티 (S-SPG) ────────────────────────────────
  { menuCode: 'S-SPG-001', category: '사이드', subCategory: '스파게티', menuName: '쉬림프 아라비아따 스파게티', size: null, price: 8500, displayOrder: 7010 },
  { menuCode: 'S-SPG-002', category: '사이드', subCategory: '스파게티', menuName: '오븐 스파게티',              size: null, price: 7700, displayOrder: 7020 },

  // ── 사이드 — 떡볶이 (S-TBK) ──────────────────────────────────
  { menuCode: 'S-TBK-001', category: '사이드', subCategory: '떡볶이', menuName: '오븐 치즈떡볶이', size: null, price: 6500, displayOrder: 7030 },

  // ── 사이드 — 치킨 (S-CHK) ────────────────────────────────────
  { menuCode: 'S-CHK-001', category: '사이드', subCategory: '치킨', menuName: '치킨바사삭12PCS',  size: null, price: 6900, displayOrder: 7040 },
  { menuCode: 'S-CHK-002', category: '사이드', subCategory: '치킨', menuName: '치킨바사삭6PCS',   size: null, price: 3900, displayOrder: 7041 },
  { menuCode: 'S-CHK-003', category: '사이드', subCategory: '치킨', menuName: '핫윙4PCS',         size: null, price: 3900, displayOrder: 7050 },
  { menuCode: 'S-CHK-004', category: '사이드', subCategory: '치킨', menuName: '그릴닭다리살3PCS', size: null, price: 4200, displayOrder: 7060 },

  // ── 사이드 — 튀김 (S-FRY) ────────────────────────────────────
  { menuCode: 'S-FRY-001', category: '사이드', subCategory: '튀김', menuName: '통통새우링4PCS', size: null, price: 3500, displayOrder: 7070 },

  // ── 사이드 — 스낵 (S-SNK) ────────────────────────────────────
  { menuCode: 'S-SNK-001', category: '사이드', subCategory: '스낵', menuName: '흑미크림참치즈볼5PCS', size: null, price: 4900, displayOrder: 7080 },
  { menuCode: 'S-SNK-002', category: '사이드', subCategory: '스낵', menuName: '시나몬츄러스4PCS',     size: null, price: 3600, displayOrder: 7090 },

  // ── 사이드 — 샐러드 (S-SLD) ──────────────────────────────────
  { menuCode: 'S-SLD-001', category: '사이드', subCategory: '샐러드', menuName: '콘코울슬로', size: null, price: 2700, displayOrder: 7100 },

  // ── 사이드 — 피클류 (S-PKL) ──────────────────────────────────
  { menuCode: 'S-PKL-001', category: '사이드', subCategory: '피클류', menuName: '피클',       size: null, price: 900,  displayOrder: 7110 },
  { menuCode: 'S-PKL-002', category: '사이드', subCategory: '피클류', menuName: '할라피뇨팩', size: null, price: 1000, displayOrder: 7120 },

  // ── 소스 (S-SAU) — 별도 카테고리 ────────────────────────────
  { menuCode: 'S-SAU-001', category: '소스', subCategory: '소스추가', menuName: '갈릭디핑소스',   size: null, price: 200, displayOrder: 7200 },
  { menuCode: 'S-SAU-002', category: '소스', subCategory: '소스추가', menuName: '스위트칠리소스', size: null, price: 200, displayOrder: 7210 },
  { menuCode: 'S-SAU-003', category: '소스', subCategory: '소스추가', menuName: '핫소스',         size: null, price: 100, displayOrder: 7220 },
  { menuCode: 'S-SAU-004', category: '소스', subCategory: '소스추가', menuName: '꿀',             size: null, price: 500, displayOrder: 7230 },

  // ── 음료 — 코카콜라 (D-CC) ───────────────────────────────────
  { menuCode: 'D-CC-001-355',  category: '음료', subCategory: '코카콜라', menuName: '코카콜라355ml',   size: null, price: 1600, displayOrder: 8010 },
  { menuCode: 'D-CC-001-500',  category: '음료', subCategory: '코카콜라', menuName: '코카콜라500ml',   size: null, price: 1800, displayOrder: 8011 },
  { menuCode: 'D-CC-001-1250', category: '음료', subCategory: '코카콜라', menuName: '코카콜라1.25L',  size: null, price: 2500, displayOrder: 8012 },

  // ── 음료 — 코카콜라 제로 (D-CZ) ─────────────────────────────
  { menuCode: 'D-CZ-001-355',  category: '음료', subCategory: '코카콜라 제로', menuName: '코카콜라제로355ml',  size: null, price: 1600, displayOrder: 8020 },
  { menuCode: 'D-CZ-001-500',  category: '음료', subCategory: '코카콜라 제로', menuName: '코카콜라제로500ml',  size: null, price: 1800, displayOrder: 8021 },
  { menuCode: 'D-CZ-001-1250', category: '음료', subCategory: '코카콜라 제로', menuName: '코카콜라제로1.25L', size: null, price: 2500, displayOrder: 8022 },

  // ── 음료 — 스프라이트 (D-SPR) ────────────────────────────────
  { menuCode: 'D-SPR-001-355',  category: '음료', subCategory: '스프라이트', menuName: '스프라이트355ml', size: null, price: 1600, displayOrder: 8030 },
  { menuCode: 'D-SPR-001-500',  category: '음료', subCategory: '스프라이트', menuName: '스프라이트500ml', size: null, price: 1800, displayOrder: 8031 },
  { menuCode: 'D-SPR-001-1500', category: '음료', subCategory: '스프라이트', menuName: '스프라이트1.5L', size: null, price: 2500, displayOrder: 8032 },

  // ── 엣지/도우 옵션 (OPT-EDGE) ────────────────────────────────
  { menuCode: 'OPT-EDGE-001', category: '엣지', subCategory: '도우옵션', menuName: '석쇠도우',       size: null, price: 0,    displayOrder: 9010 },
  { menuCode: 'OPT-EDGE-002', category: '엣지', subCategory: '도우옵션', menuName: '치즈크러스트',   size: null, price: 4000, displayOrder: 9020 },
  { menuCode: 'OPT-EDGE-003', category: '엣지', subCategory: '도우옵션', menuName: '골드스윗 크러스트', size: null, price: 4000, displayOrder: 9030 },
];

/* ── 공개 함수 ───────────────────────────────────────────────── */

/** 기본 메뉴 코드 일괄 등록 — 이미 있는 코드는 건너뜀 */
export async function seedMenuMaster() {
  // 7번가(main) 전용 메뉴 시드 — 다른 브랜드 DB에 7번가 메뉴 주입 방지
  if (getActiveBrandId() !== 'main') throw new Error('7번가피자 전용 시드입니다. 현재 브랜드에는 적용되지 않습니다.');
  let inserted = 0;
  let skipped  = 0;

  for (const entry of SEED_ENTRIES) {
    try {
      const price = getDefaultPrice(entry.menuCode);
      const result = await upsertMenuMaster({ ...entry, status: 'active', source: 'seed', ...(price ? { price } : {}) });
      if (result.mode === 'insert') inserted++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  return { total: SEED_ENTRIES.length, inserted, skipped };
}

/** 시드 항목 목록 반환 (미리보기용) */
export function getSeedEntries() {
  return SEED_ENTRIES;
}
