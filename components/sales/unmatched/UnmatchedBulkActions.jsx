'use client';
import { UnmatchedBulkRulePanel } from './UnmatchedBulkRulePanel';

export function UnmatchedBulkActions({
  selectedCount,
  confirmBulk,
  bulkBusy,
  showBulkRule,
  bulkRuleBusy,
  bulkRuleCat,
  bulkRuleGroup,
  bulkRuleDetail,
  categoryOptions,
  onClearSelection,
  onCancelBulkConfirm,
  onConfirmBulkExclude,
  onToggleBulkRule,
  onAskBulkExclude,
  onBulkRuleCatChange,
  onBulkRuleGroupChange,
  onBulkRuleDetailChange,
  onCancelBulkRule,
  onApplyBulkRule,
}) {
  if (selectedCount <= 0) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--accent-soft)',
          borderRadius: showBulkRule ? '8px 8px 0 0' : 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-text)' }}>
          <b>{selectedCount}건</b> 선택됨
        </span>
        {confirmBulk ? (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--negative)' }}>
              선택한 항목을 모두 제외 처리할까요?
            </span>
            <button className="btn sm" onClick={onCancelBulkConfirm} disabled={bulkBusy}>
              취소
            </button>
            <button
              className="btn sm"
              onClick={onConfirmBulkExclude}
              disabled={bulkBusy}
              style={{
                background: 'var(--negative)',
                color: '#fff',
                borderColor: 'var(--negative)',
              }}
            >
              {bulkBusy ? '처리 중...' : '일괄 제외 확인'}
            </button>
          </span>
        ) : (
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <button className="btn sm" onClick={onClearSelection}>
              선택 해제
            </button>
            <button className="btn sm" onClick={onToggleBulkRule}>
              {showBulkRule ? '분류 적용 닫기' : '분류 일괄 적용'}
            </button>
            <button
              className="btn sm"
              onClick={onAskBulkExclude}
              style={{ color: 'var(--negative)' }}
            >
              선택 일괄 제외
            </button>
          </span>
        )}
      </div>

      {showBulkRule && (
        <UnmatchedBulkRulePanel
          category={bulkRuleCat}
          groupName={bulkRuleGroup}
          detailName={bulkRuleDetail}
          categoryOptions={categoryOptions}
          busy={bulkRuleBusy}
          selectedCount={selectedCount}
          onCategoryChange={onBulkRuleCatChange}
          onGroupChange={onBulkRuleGroupChange}
          onDetailChange={onBulkRuleDetailChange}
          onCancel={onCancelBulkRule}
          onApply={onApplyBulkRule}
        />
      )}
    </div>
  );
}
