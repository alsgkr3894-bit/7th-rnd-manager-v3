import { useState, useMemo } from 'react';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';

const ISSUE_META = {
  'price-up': {
    label: '단가 인상',
    Ico: Icon.arrowUp,
    color: 'var(--negative)',
    bg: 'var(--negative-soft)',
  },
  'price-down': {
    label: '단가 인하',
    Ico: Icon.arrowDown,
    color: 'var(--positive)',
    bg: 'var(--positive-soft)',
  },
  uncategorized: { label: '미분류', Ico: Icon.tag, color: 'var(--warn)', bg: 'var(--warn-soft)' },
  'no-unit': {
    label: '포장수량 없음',
    Ico: Icon.alert,
    color: 'var(--warn)',
    bg: 'var(--warn-soft)',
  },
  'no-price-link': {
    label: '단가 미연동',
    Ico: Icon.alert,
    color: 'var(--warn)',
    bg: 'var(--warn-soft)',
  },
  'no-scope': {
    label: '전용/범용 미지정',
    Ico: Icon.alert,
    color: 'var(--warn)',
    bg: 'var(--warn-soft)',
  },
  'missing-origin': {
    label: '원산지 미표기',
    Ico: Icon.alert,
    color: 'var(--warn)',
    bg: 'var(--warn-soft)',
  },
  'missing-allergen': {
    label: '알레르기 미표기',
    Ico: Icon.alert,
    color: 'var(--warn)',
    bg: 'var(--warn-soft)',
  },
};

// 이 두 이슈 필터에서만 전체선택 + 일괄 "없음" 적용 UI를 보여준다.
const BULK_NONE_ACTIONS = {
  'missing-origin': { field: 'originNone', label: '원산지 없음' },
  'missing-allergen': { field: 'allergenNone', label: '알레르기 없음' },
};

function fmtPriceDiff({ oldPrice, newPrice, diff, pct }) {
  const safeDiff = Number.isFinite(Number(diff)) ? Number(diff) : 0;
  const safePct = Number.isFinite(Number(pct)) ? Number(pct) : 0;
  const sign = safeDiff > 0 ? '+' : '';
  return `${formatNumber(oldPrice)}원 → ${formatNumber(newPrice)}원 (${sign}${safePct.toFixed(1)}% / ${sign}${formatNumber(safeDiff)}원)`;
}

function hasIssue(row, issue) {
  return Array.isArray(row.issues) && row.issues.includes(issue);
}

function IssueCard({
  r,
  onEdit,
  onConfirmPriceManual,
  isViewer = false,
  selectable = false,
  selected = false,
  onToggleSelect,
}) {
  const row = r && typeof r === 'object' ? r : {};
  const issues = Array.isArray(row.issues) ? row.issues : [];
  const name = row.ingredientName || row.displayName || row.productName || '-';
  const handleEdit = typeof onEdit === 'function' ? onEdit : () => {};
  const confirmPriceManual =
    typeof onConfirmPriceManual === 'function' ? onConfirmPriceManual : () => {};
  // 제때 연동은 없지만 수동으로 단가를 입력한 항목만 "확인" 버튼을 보여준다.
  const canConfirmPriceManual =
    issues.includes('no-price-link') && !row.jetteLinked && row.priceOverride != null;

  return (
    <div
      className="card"
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px' }}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect?.(row.id)}
          disabled={isViewer || row.id == null}
          style={{ width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
          aria-label={`${name} 선택`}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{name}</span>
          {row.productCode && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{row.productCode}</span>
          )}
        </div>
        {row.priceDiff && (
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>
            {fmtPriceDiff(row.priceDiff)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          {issues.map(iss => {
            const m = ISSUE_META[iss];
            if (!m) return null;
            const IcoComp = m.Ico;
            return (
              <span
                key={iss}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 6,
                  background: m.bg,
                  color: m.color,
                }}
              >
                <IcoComp style={{ width: 11, height: 11 }} />
                {m.label}
              </span>
            );
          })}
        </div>
      </div>
      {canConfirmPriceManual && (
        <button
          className="btn sm"
          onClick={() => confirmPriceManual(row)}
          disabled={isViewer}
          title="제때 연동 없이 수동 입력한 단가임을 확인 처리 — 이슈 목록에서 제외됩니다"
        >
          <Icon.check style={{ width: 13, height: 13 }} /> 단가 미연동 확인
        </button>
      )}
      <button className="btn sm" onClick={() => handleEdit(row)} disabled={isViewer}>
        <Icon.edit style={{ width: 13, height: 13 }} /> 수정
      </button>
    </div>
  );
}

export function IssuesView({
  issueRows,
  onEdit,
  onConfirmPriceManual,
  onBulkApplyOriginAllergenNone,
  isViewer = false,
}) {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(() => new Set());
  const [applying, setApplying] = useState(false);
  const safeIssueRows = useMemo(
    () => (Array.isArray(issueRows) ? issueRows.filter(r => r && typeof r === 'object') : []),
    [issueRows]
  );

  const counts = useMemo(
    () => ({
      'price-up': safeIssueRows.filter(r => hasIssue(r, 'price-up')).length,
      'price-down': safeIssueRows.filter(r => hasIssue(r, 'price-down')).length,
      uncategorized: safeIssueRows.filter(r => hasIssue(r, 'uncategorized')).length,
      'no-unit': safeIssueRows.filter(r => hasIssue(r, 'no-unit')).length,
      'no-price-link': safeIssueRows.filter(r => hasIssue(r, 'no-price-link')).length,
      'missing-origin': safeIssueRows.filter(r => hasIssue(r, 'missing-origin')).length,
      'missing-allergen': safeIssueRows.filter(r => hasIssue(r, 'missing-allergen')).length,
    }),
    [safeIssueRows]
  );
  const TYPES = [
    { id: 'all', label: '전체', count: safeIssueRows.length },
    { id: 'price-up', label: '단가 인상', count: counts['price-up'] },
    { id: 'price-down', label: '단가 인하', count: counts['price-down'] },
    { id: 'uncategorized', label: '미분류', count: counts.uncategorized },
    { id: 'no-unit', label: '포장수량 없음', count: counts['no-unit'] },
    { id: 'no-price-link', label: '단가 미연동', count: counts['no-price-link'] },
    { id: 'missing-origin', label: '원산지 미표기', count: counts['missing-origin'] },
    { id: 'missing-allergen', label: '알레르기 미표기', count: counts['missing-allergen'] },
  ];

  const filtered =
    filter === 'all' ? safeIssueRows : safeIssueRows.filter(r => hasIssue(r, filter));

  const bulkAction = BULK_NONE_ACTIONS[filter];
  const selectableIds = useMemo(
    () => (bulkAction ? filtered.filter(r => r.id != null).map(r => r.id) : []),
    [bulkAction, filtered]
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selected.has(id));

  function changeFilter(nextFilter) {
    setFilter(nextFilter);
    setSelected(new Set());
  }

  function toggleSelectAll() {
    setSelected(prev => (allSelected ? new Set() : new Set(selectableIds)));
  }

  function toggleSelectOne(id) {
    if (id == null) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBulkNone() {
    if (!bulkAction || applying || !selected.size) return;
    if (typeof onBulkApplyOriginAllergenNone !== 'function') return;
    setApplying(true);
    try {
      await onBulkApplyOriginAllergenNone([...selected], { [bulkAction.field]: true });
      setSelected(new Set());
    } finally {
      setApplying(false);
    }
  }

  if (safeIssueRows.length === 0) {
    return (
      <div className="card" style={{ minHeight: 160, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          <Icon.check style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>이슈가 없습니다</div>
          <div style={{ fontSize: 13 }}>모든 식자재 항목이 정상적으로 설정되어 있습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TYPES.map(t => (
          <button
            key={t.id}
            className={'chip' + (filter === t.id ? ' active' : '')}
            onClick={() => changeFilter(t.id)}
          >
            {t.label} {t.count}
          </button>
        ))}
      </div>

      {bulkAction && (
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 18px',
            background: 'var(--surface-2)',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: selectableIds.length ? 'pointer' : 'default',
            }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              disabled={isViewer || !selectableIds.length}
              style={{ width: 16, height: 16 }}
            />
            전체선택 ({selected.size}/{selectableIds.length})
          </label>
          <button
            className="btn sm primary"
            onClick={applyBulkNone}
            disabled={isViewer || !selected.size || applying}
            style={{ marginLeft: 'auto' }}
          >
            <Icon.check style={{ width: 13, height: 13 }} />
            {applying ? '적용 중…' : `선택 항목 ${bulkAction.label} 일괄 적용`}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((r, i) => (
          <IssueCard
            key={`${r.productCode ?? r.id ?? 'm'}-${i}`}
            r={r}
            onEdit={onEdit}
            onConfirmPriceManual={onConfirmPriceManual}
            isViewer={isViewer}
            selectable={!!bulkAction}
            selected={r.id != null && selected.has(r.id)}
            onToggleSelect={toggleSelectOne}
          />
        ))}
      </div>
    </>
  );
}
