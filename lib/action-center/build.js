/**
 * lib/action-center/build.js — 원천 데이터에서 ActionItem 목록 생성
 *
 * 각 함수는 외부 I/O 없이 이미 로드된 데이터로 작동한다(순수 builder).
 * ActionItem: { id, source, title, desc, severity, href, createdAt, dueHint? }
 */
import { isRoleItemVisible } from '@/lib/navigation/role-visibility';

/**
 * @typedef {Object} ActionItem
 * @property {string} id        — 고유 식별자 (source + 파라미터 기반)
 * @property {string} source    — 원천 카테고리
 * @property {string} title
 * @property {string} [desc]
 * @property {'critical'|'warn'|'info'} severity
 * @property {string} href
 * @property {number} createdAt — Date.now()
 * @property {string} [dueHint]
 * @property {boolean} [requiresEdit]
 */

function idPart(value) {
  return String(value ?? 'none')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9가-힣_.:-]/g, '');
}

function actionId(base, parts = []) {
  const suffix = parts.map(idPart).filter(Boolean).join('__');
  return suffix ? `${base}__${suffix}` : base;
}

/**
 * 미매칭 메뉴 판매 항목
 */
export function buildUnmatchedActions({ unmatchedCount = 0 }) {
  if (unmatchedCount <= 0) return [];
  return [
    {
      id: actionId('unmatched-menu', [unmatchedCount]),
      source: 'sales-unmatched',
      title: `미매칭 메뉴 ${unmatchedCount}건 처리 필요`,
      desc: '판매량에 메뉴명이 매칭되지 않으면 원가·매출 분석이 부정확해집니다',
      severity: 'warn',
      href: '/menu-sales/unmatched',
      createdAt: Date.now(),
      dueHint: '가능한 빨리',
    },
  ];
}

/**
 * 보고예정 노트
 */
export function buildReportingNoteActions({ reportingCount = 0 }) {
  if (reportingCount <= 0) return [];
  return [
    {
      id: actionId('reporting-notes', [reportingCount]),
      source: 'notes',
      title: `보고예정 노트 ${reportingCount}건`,
      desc: '보고 전 최종 검토가 필요한 노트가 있습니다',
      severity: 'info',
      href: '/note?status=보고예정',
      createdAt: Date.now(),
      dueHint: '보고 전',
    },
  ];
}

/**
 * 업로드 신선도 — 지난달 기준 stale인 모듈
 */
export function buildUploadFreshnessActions({ uploadFreshness }) {
  if (!uploadFreshness) return [];
  const items = [];
  const { sales, shipment, price } = uploadFreshness;

  if (sales?.stale) {
    items.push({
      id: actionId('upload-sales-stale', [sales.never ? 'never' : `${sales.year}-${sales.month}`]),
      source: 'upload',
      title: sales.never ? '판매량 업로드 이력 없음' : '판매량 업로드 지연',
      desc: sales.never
        ? '판매량 데이터가 아직 없습니다'
        : `최신 판매량이 ${sales.year}.${String(sales.month).padStart(2, '0')}로 업데이트가 필요합니다`,
      severity: sales.never ? 'critical' : 'warn',
      href: '/menu-sales/upload',
      requiresEdit: true,
      createdAt: Date.now(),
      dueHint: '이번 달 내',
    });
  }

  if (shipment?.stale) {
    items.push({
      id: actionId('upload-shipment-stale', [
        shipment.never ? 'never' : `${shipment.year}-${shipment.month}`,
      ]),
      source: 'upload',
      title: shipment.never ? '출고량 업로드 이력 없음' : '출고량 업로드 지연',
      desc: shipment.never
        ? '제때 출고량 데이터가 아직 없습니다'
        : `최신 출고량이 ${shipment.year}.${String(shipment.month).padStart(2, '0')}로 업데이트가 필요합니다`,
      severity: shipment.never ? 'warn' : 'info',
      href: '/jette/shipment',
      createdAt: Date.now(),
      dueHint: '이번 달 내',
    });
  }

  if (price?.stale) {
    items.push({
      id: actionId('upload-price-stale', [
        price.never ? 'never' : price.updateDate || price.yearMonth || 'stale',
      ]),
      source: 'upload',
      title: price.never ? '제때 단가 업로드 이력 없음' : '제때 단가 업로드 지연',
      desc: price.never
        ? '제때 단가 데이터가 아직 없습니다'
        : '최신 단가 파일로 업데이트하면 원가 계산이 정확해집니다',
      severity: price.never ? 'warn' : 'info',
      href: '/jette/price-compare',
      createdAt: Date.now(),
      dueHint: '단가 변경 시',
    });
  }

  return items;
}

/**
 * 백업 권장
 */
export function buildBackupActions({ backupReminder }) {
  if (!backupReminder) return [];
  if (!backupReminder.stale && !backupReminder.never) return [];
  return [
    {
      id: actionId('backup-recommended', [
        backupReminder.never ? 'never' : `days-${backupReminder.daysSince ?? 'unknown'}`,
      ]),
      source: 'backup',
      title: backupReminder.never ? '데이터 백업 이력 없음' : '데이터 백업 권장',
      desc: backupReminder.never
        ? '아직 백업을 한 번도 하지 않으셨습니다. 지금 바로 백업하세요.'
        : `마지막 백업으로부터 시간이 지났습니다 (${backupReminder.daysSince ?? '?'}일 전)`,
      severity: backupReminder.never ? 'critical' : 'warn',
      href: '/settings/backup',
      createdAt: Date.now(),
      dueHint: '주기적으로',
    },
  ];
}

/**
 * 단가 없는 식자재
 */
export function buildNoPriceActions({ noPriceCount = 0 }) {
  if (noPriceCount <= 0) return [];
  return [
    {
      id: actionId('ingredient-no-price', [noPriceCount]),
      source: 'ingredient',
      title: `단가 없는 식자재 ${noPriceCount}개`,
      desc: '단가가 없으면 원가 계산이 불완전합니다',
      severity: 'warn',
      href: '/ingredient/manage?catFilter=__no_price__',
      createdAt: Date.now(),
      dueHint: '원가 작업 전',
    },
  ];
}

/**
 * 원가율 경보 메뉴
 */
export function buildCostAlertActions({ costAlertData }) {
  if (!costAlertData?.alertMenus?.length) return [];
  const count = costAlertData.alertMenus.length;
  return [
    {
      id: actionId('cost-alert', [count, costAlertData.threshold ?? costAlertData.riskThreshold]),
      source: 'cost',
      title: `원가율 경보 메뉴 ${count}개`,
      desc: `원가율이 기준치를 초과한 메뉴가 있습니다`,
      severity: 'warn',
      href: '/cost/margin',
      createdAt: Date.now(),
      dueHint: '메뉴 리뉴얼 전',
    },
  ];
}

/**
 * 전체 ActionItem 목록 빌드
 * @param {object} data - useHomeDashboardData 반환값과 동일 구조
 * @returns {ActionItem[]}
 */
export function buildAllActions({
  unmatchedCount = 0,
  reportingCount = 0,
  uploadFreshness,
  backupReminder,
  ingredientHealth,
  costAlertData,
  canEdit = true,
} = {}) {
  const noPriceCount = ingredientHealth?.noPriceCount ?? 0;

  return [
    ...buildUnmatchedActions({ unmatchedCount }),
    ...buildReportingNoteActions({ reportingCount }),
    ...buildUploadFreshnessActions({ uploadFreshness }),
    ...buildBackupActions({ backupReminder }),
    ...buildNoPriceActions({ noPriceCount }),
    ...buildCostAlertActions({ costAlertData }),
  ].filter(item => isRoleItemVisible(item, canEdit));
}
