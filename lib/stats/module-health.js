const STATUS_RANK = {
  good: 0,
  warn: 1,
  bad: 2,
};

function asFiniteNumber(value, fallback = null) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asObjectArray(value) {
  return Array.isArray(value)
    ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function normalizeUploadPeriod(status) {
  const year = asFiniteNumber(status?.year);
  const month = asFiniteNumber(status?.month);
  if (year == null || month == null || month < 1 || month > 12) return null;
  return { year: Math.trunc(year), month: Math.trunc(month) };
}

function uploadLabel(status) {
  if (!status) return '확인 중';
  if (status.never) return '이력 없음';
  const period = normalizeUploadPeriod(status);
  if (!period) return '확인 중';
  return `${period.year}.${String(period.month).padStart(2, '0')}`;
}

function worseOf(...statuses) {
  return statuses.reduce(
    (worst, status) => (STATUS_RANK[status] > STATUS_RANK[worst] ? status : worst),
    'good'
  );
}

function uploadStatusOf(status) {
  if (!status) return 'warn';
  if (status.never) return 'bad';
  if (!normalizeUploadPeriod(status)) return 'warn';
  if (status.stale) return 'warn';
  return 'good';
}

function backupStatusOf(reminder) {
  if (!reminder) return 'warn';
  if (reminder.never) return 'bad';
  if (reminder.stale) return 'warn';
  if (asFiniteNumber(reminder.daysSince) == null) return 'warn';
  return 'good';
}

function backupLabel(reminder) {
  if (!reminder) return '확인 중';
  if (reminder.never) return '이력 없음';
  const daysSince = asFiniteNumber(reminder.daysSince);
  return daysSince == null ? '확인 중' : `${Math.max(0, Math.trunc(daysSince))}일 전`;
}

function costStatusOf(items) {
  const safeItems = asObjectArray(items);
  const alertCount = safeItems.filter(item => (asFiniteNumber(item.costRate, 0) ?? 0) > 40).length;
  const cautionCount = safeItems.filter(item => {
    const costRate = asFiniteNumber(item.costRate, 0) ?? 0;
    return costRate > 30 && costRate <= 40;
  }).length;
  if (alertCount > 0) return 'bad';
  if (cautionCount > 0) return 'warn';
  return 'good';
}

function salesHealth({ freshness, openIssueCount }) {
  const uploadStatus = uploadStatusOf(freshness?.sales);
  const issueStatus = openIssueCount > 0 ? 'warn' : 'good';
  const status = worseOf(uploadStatus, issueStatus);
  return {
    id: 'sales',
    label: '판매 관리',
    status,
    href: openIssueCount > 0 ? '/menu-sales/unmatched' : '/menu-sales/upload',
    metric:
      openIssueCount > 0 ? `미매칭 ${openIssueCount}건` : `판매량 ${uploadLabel(freshness?.sales)}`,
    detail: freshness?.sales?.stale
      ? '판매량 업로드 상태를 확인하세요'
      : '판매량과 미매칭 상태를 확인합니다',
  };
}

function jetteHealth({ freshness }) {
  const priceStatus = uploadStatusOf(freshness?.price);
  const shipmentStatus = uploadStatusOf(freshness?.shipment);
  const status = worseOf(priceStatus, shipmentStatus);
  return {
    id: 'jette',
    label: '제때 상품',
    status,
    href: priceStatus !== 'good' ? '/jette/price-compare' : '/jette/shipment',
    metric: `단가 ${uploadLabel(freshness?.price)} · 출고 ${uploadLabel(freshness?.shipment)}`,
    detail:
      status === 'good'
        ? '단가와 출고량 업로드가 기준월을 충족합니다'
        : '단가/출고량 업로드 상태를 확인하세요',
  };
}

function costHealth({ costAlertData }) {
  const items = asObjectArray(costAlertData?.items);
  const alertCount = items.filter(item => (asFiniteNumber(item.costRate, 0) ?? 0) > 40).length;
  const cautionCount = items.filter(item => {
    const costRate = asFiniteNumber(item.costRate, 0) ?? 0;
    return costRate > 30 && costRate <= 40;
  }).length;
  return {
    id: 'cost',
    label: '원가 · 식자재',
    status: costStatusOf(items),
    href: alertCount > 0 ? '/cost/margin' : '/cost/ingredient-price',
    metric: alertCount > 0 ? `경보 ${alertCount}건` : `주의 ${cautionCount}건`,
    detail:
      alertCount > 0
        ? '원가율 40% 초과 메뉴를 확인하세요'
        : '원가율과 식자재 단가 상태를 확인합니다',
  };
}

function noteHealth({ todos, pipeline }) {
  const safeTodos = asObjectArray(todos);
  const columns = asObjectArray(pipeline?.columns);
  const todoCount = safeTodos.length;
  const activeCount = columns.reduce(
    (sum, column) => sum + (asFiniteNumber(column.count, 0) ?? 0),
    0
  );
  return {
    id: 'note',
    label: 'R&D 노트',
    status: todoCount > 0 ? 'warn' : 'good',
    href: todoCount > 0 ? '/note' : '/note/calendar',
    metric: todoCount > 0 ? `할 일 ${todoCount}건` : `진행 ${activeCount}건`,
    detail:
      todoCount > 0
        ? '보고예정 또는 마감 임박 항목이 있습니다'
        : '오늘 처리할 긴급 항목이 없습니다',
  };
}

function systemHealth({ backupReminder }) {
  return {
    id: 'system',
    label: '시스템',
    status: backupStatusOf(backupReminder),
    href: '/settings/backup',
    metric: `백업 ${backupLabel(backupReminder)}`,
    detail: backupReminder?.stale ? '백업 이력을 갱신하세요' : '백업 주기가 정상 범위입니다',
  };
}

export function buildModuleHealth({
  freshness,
  backupReminder,
  issues = [],
  costAlertData = null,
  todos = [],
  pipeline = null,
  isMain = true,
} = {}) {
  const safeIssues = asObjectArray(issues);
  const openIssueCount = safeIssues.filter(issue => issue?.status === 'open').length;
  const modules = [
    salesHealth({ freshness, openIssueCount }),
    isMain ? jetteHealth({ freshness }) : null,
    costHealth({ costAlertData }),
    noteHealth({ todos, pipeline }),
    systemHealth({ backupReminder }),
  ].filter(Boolean);

  return modules;
}

export function countModuleHealth(modules) {
  const safeModules = Array.isArray(modules) ? modules : [];
  return safeModules.reduce(
    (acc, item) => {
      if (!item?.status) return acc;
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    { good: 0, warn: 0, bad: 0 }
  );
}
