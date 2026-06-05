/**
 * menu.js — 사이드바 메뉴 구조 정의
 *
 * 7개 섹션(판매량 관리 / 상품 관리 / 원가계산 / 영양성분 / 메모 / 보고서센터 / 시스템)으로 그룹화.
 * 사이드바 컴포넌트는 NAV_SECTIONS를 순회하며 섹션 라벨 + 각 그룹을 렌더링.
 *
 * 아이콘은 문자열 키로 보관 (Sidebar에서 Icon[key]로 매핑).
 */

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
  id: 'home', label: '홈', iconKey: 'home', href: '/'
};

/** 섹션 단위 메뉴 — 2026-05-29 재편 (관련 기능 그룹화) */
export const NAV_SECTIONS = [
  {
    sectionLabel: '개발 메모',
    groups: [
      {
        id: 'note', label: '메뉴개발노트', iconKey: 'note',
        children: [
          { id: 'note-list',     label: '노트 목록',   href: '/note' },
          { id: 'note-journal',  label: '연구일지',    href: '/note/journal' },
          { id: 'note-calendar', label: '일정 달력',   href: '/note/calendar' },
          { id: 'note-board',    label: '칸반 보드',   href: '/note/board' },
          { id: 'note-write',    label: '노트 작성',   href: '/note/write' },
          { id: 'note-sample',   label: '샘플기록',    href: '/note/sample' },
        ],
      },
    ],
  },

  {
    sectionLabel: '판매 관리',
    groups: [
      {
        id: 'menu-sales', label: '메뉴 판매량', iconKey: 'chart',
        children: [
          { id: 'menu-sales-upload',       label: '판매량 업로드',  href: '/menu-sales/upload' },
          { id: 'menu-sales-rank-compare', label: '순위 및 비교',   href: '/menu-sales/rank-compare' },
          { id: 'menu-sales-unmatched',    label: '미매칭 관리',    href: '/menu-sales/unmatched' },
          { id: 'menu-sales-settings',     label: '분류 규칙',      href: '/menu-sales/settings' },
        ],
      },
    ],
  },

  {
    sectionLabel: '상품 관리',
    groups: [
      {
        id: 'jette', label: '제때상품관리', iconKey: 'box',
        children: [
          { id: 'jette-price-compare', label: '제때 가격 비교',  href: '/jette/price-compare' },
          { id: 'jette-shipment',      label: '제품 출고량',     href: '/jette/shipment' },
          { id: 'jette-settings',      label: '설정',           href: '/jette/settings' },
        ],
      },
      {
        id: 'ingredient', label: '식자재', iconKey: 'tag',
        children: [
          { id: 'ingredient-manage', label: '식자재 관리',      href: '/ingredient/manage' },
          { id: 'ingredient-list',   label: '식자재 리스트',    href: '/ingredient/list' },
          { id: 'ingredient-usage',  label: '제품별 사용 현황', href: '/ingredient/usage' },
        ],
      },
      {
        id: 'menu-master', label: '메뉴 마스터', iconKey: 'doc',
        href: '/menu-master',
      },
    ],
  },

  {
    sectionLabel: '원가 · 영양',
    groups: [
      {
        id: 'cost', label: '원가계산', iconKey: 'calc',
        children: [
          { id: 'cost-ingredient-price', label: '재료 단가표',  href: '/cost/ingredient-price' },
          { id: 'cost-recipe',           label: '원가 레시피',  href: '/cost/recipe' },
          { id: 'cost-margin',           label: '원가마진표',   href: '/cost/margin' },
        ],
      },
      {
        id: 'nutrition', label: '영양성분', iconKey: 'beaker',
        children: [
          { id: 'nutrition-export',   label: '표 출력 (영양/원산지/알레르기)', href: '/nutrition/export' },
          { id: 'nutrition-menu',     label: '영양성분 정보 및 계산',          href: '/nutrition/menu' },
          { id: 'nutrition-allergen', label: '알레르기 정보',                  href: '/nutrition/allergen' },
          { id: 'nutrition-origin',   label: '원산지 정보',                    href: '/nutrition/origin' },
        ],
      },
    ],
  },

  {
    sectionLabel: '보고서센터',
    groups: [
      {
        id: 'report', label: '보고서', iconKey: 'doc',
        children: [
          { id: 'report-home',     label: '보고서센터',       href: '/report' },
          { id: 'report-sales',    label: '판매량 보고서',    href: '/report/sales' },
          { id: 'report-price',    label: '제때 가격 보고서', href: '/report/price' },
          { id: 'report-shipment', label: '출고량 보고서',    href: '/report/shipment' },
          { id: 'report-cost',     label: '원가계산 보고서',  href: '/report/cost' },
        ],
      },
    ],
  },

  {
    sectionLabel: '시스템',
    groups: [
      {
        id: 'settings', label: '설정 / 백업', iconKey: 'gear',
        children: [
          { id: 'settings-system',  label: '시스템 설정', href: '/settings/system' },
          { id: 'settings-account', label: '계정 관리',   href: '/settings/account' },
          { id: 'settings-backup',  label: '데이터 백업', href: '/settings/backup' },
          { id: 'settings-restore', label: '데이터 복원', href: '/settings/restore' },
        ],
      },
    ],
  },
];


/** 모바일 하단 탭바 정의 — AppShell과 공유 */
export const MOBILE_TAB_DEFS = [
  { href: '/',                   label: '홈',     iconKey: 'home' },
  { href: '/menu-sales/rank-compare', label: '판매량', iconKey: 'chart', badgeKey: 'unmatched' },
  { href: '/cost/pizza',         label: '원가',   iconKey: 'calc' },
  { href: '/note',               label: '노트',   iconKey: 'note' },
  { href: '/report',             label: '보고서', iconKey: 'doc' },
];
