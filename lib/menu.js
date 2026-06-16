/**
 * menu.js — 사이드바 메뉴 구조 정의
 *
 * 7개 섹션(개발 메모 / 보고서센터 / 상품 관리 / 메뉴 / 원가·영양 / 판매 관리 / 시스템)으로 그룹화.
 * 사이드바 컴포넌트는 NAV_SECTIONS를 순회하며 섹션 라벨 + 각 그룹을 렌더링.
 *
 * 아이콘은 문자열 키로 보관 (Sidebar에서 Icon[key]로 매핑).
 */

import { COST_COMMON_GROUPS_ROUTE, COST_MARGIN_ROUTE, MENU_MASTER_ROUTE } from '@/lib/cost/routes';
import { JETTE_NAV_ITEMS } from '@/lib/jette/navigation';
import { MENU_SALES_ANALYSIS_ROUTE } from '@/lib/sales/navigation';
import { REPORT_NAV_ITEMS } from '@/lib/report/navigation';

/**
 * @typedef {object} MenuChild
 * @property {string} id
 * @property {string} label
 * @property {string} href
 * @property {number} [badge]
 */

/**
 * @typedef {object} MenuGroup
 * @property {string} id
 * @property {string} label
 * @property {string} iconKey  - Icon[iconKey]
 * @property {string} [href]
 * @property {number} [badge]
 * @property {MenuChild[]} [children]
 */

/**
 * @typedef {object} MenuSection
 * @property {string} sectionLabel
 * @property {MenuGroup[]} groups
 */

/** 사이드바 메인 섹션 (홈은 별도 처리) */
export const NAV_HOME = {
  id: 'home',
  label: '홈',
  iconKey: 'home',
  href: '/',
};

/** 섹션 단위 메뉴 — 2026-06-16 사용자 지정 순서 */
export const NAV_SECTIONS = [
  {
    sectionLabel: '개발 메모',
    groups: [
      {
        id: 'note',
        label: '메뉴개발노트',
        iconKey: 'note',
        children: [
          { id: 'note-calendar', label: '일정 달력', href: '/note/calendar' },
          { id: 'note-write', label: '노트 작성', href: '/note/write' },
          { id: 'note-list', label: '노트 목록', href: '/note' },
          { id: 'note-board', label: '칸반 보드', href: '/note/board' },
          { id: 'note-journal', label: '연구일지', href: '/note/journal' },
          { id: 'note-sample', label: '샘플기록', href: '/note/sample' },
        ],
      },
    ],
  },

  {
    sectionLabel: '보고서센터',
    groups: [
      {
        id: 'report',
        label: '보고서',
        iconKey: 'doc',
        children: REPORT_NAV_ITEMS,
      },
    ],
  },

  {
    sectionLabel: '상품 관리',
    groups: [
      {
        id: 'jette',
        label: '제때데이터',
        iconKey: 'box',
        children: JETTE_NAV_ITEMS,
      },
      {
        id: 'ingredient',
        label: '식자재',
        iconKey: 'tag',
        children: [
          { id: 'ingredient-manage', label: '식자재 관리', href: '/ingredient/manage' },
          { id: 'ingredient-usage', label: '제품별 사용 현황', href: '/ingredient/usage' },
        ],
      },
    ],
  },

  {
    sectionLabel: '메뉴',
    groups: [
      {
        id: 'menu',
        label: '메뉴',
        iconKey: 'doc',
        children: [{ id: 'menu-master', label: '메뉴 마스터', href: MENU_MASTER_ROUTE }],
      },
    ],
  },

  {
    sectionLabel: '원가 · 영양',
    groups: [
      {
        id: 'cost',
        label: '원가계산',
        iconKey: 'calc',
        children: [
          { id: 'cost-common', label: '공통 원가 관리', href: COST_COMMON_GROUPS_ROUTE },
          { id: 'cost-margin', label: '원가마진표', href: COST_MARGIN_ROUTE },
        ],
      },
      {
        id: 'nutrition',
        label: '영양성분',
        iconKey: 'beaker',
        children: [
          {
            id: 'nutrition-export',
            label: '표 출력 (영양/원산지/알레르기)',
            href: '/nutrition/export',
          },
          { id: 'nutrition-menu', label: '영양성분 정보 및 계산', href: '/nutrition/menu' },
          { id: 'nutrition-allergen', label: '알레르기 정보', href: '/nutrition/allergen' },
          { id: 'nutrition-origin', label: '원산지 정보', href: '/nutrition/origin' },
        ],
      },
    ],
  },

  {
    sectionLabel: '판매 관리',
    groups: [
      {
        id: 'menu-sales',
        label: '메뉴 판매량',
        iconKey: 'chart',
        children: [
          { id: 'menu-sales-upload', label: '판매량 업로드', href: '/menu-sales/upload' },
          {
            id: 'menu-sales-rank-compare',
            label: '순위 및 비교',
            href: MENU_SALES_ANALYSIS_ROUTE,
          },
          { id: 'menu-sales-unmatched', label: '미매칭 관리', href: '/menu-sales/unmatched' },
          { id: 'menu-sales-settings', label: '분류 규칙', href: '/menu-sales/settings' },
        ],
      },
    ],
  },

  {
    sectionLabel: '시스템',
    groups: [
      {
        id: 'settings',
        label: '설정 / 백업',
        iconKey: 'gear',
        children: [
          { id: 'settings-brands', label: '브랜드마스터', href: '/settings/brands' },
          { id: 'settings-system', label: '시스템 설정', href: '/settings/system' },
          { id: 'settings-account', label: '계정 관리', href: '/settings/account' },
          { id: 'settings-backup', label: '데이터 백업', href: '/settings/backup' },
          { id: 'settings-restore', label: '데이터 복원', href: '/settings/restore' },
        ],
      },
    ],
  },
];

/** 모바일 하단 탭바 정의 — AppShell과 공유 */
export const MOBILE_TAB_DEFS = [
  { href: '/', label: '홈', iconKey: 'home' },
  { href: '/note', label: '노트', iconKey: 'note' },
  { href: '/report', label: '보고서', iconKey: 'doc' },
  { href: COST_MARGIN_ROUTE, label: '원가', iconKey: 'calc' },
  { href: MENU_SALES_ANALYSIS_ROUTE, label: '판매량', iconKey: 'chart', badgeKey: 'unmatched' },
];
