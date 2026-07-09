import { Icon } from '@/components/icons';

export function ManageRowActionCell({
  excluded,
  deletePending,
  deletePreview,
  isManual,
  productCode,
  onCopy,
  onDeleteStart,
  onDeleteCancel,
  onDeleteConfirm,
  onRestore,
  onLinkSubstitute,
  isViewer = false,
}) {
  return (
    <td style={{ textAlign: 'center' }} onClick={event => event.stopPropagation()}>
      {excluded ? (
        <button className="btn sm" style={{ fontSize: 11 }} onClick={onRestore} disabled={isViewer}>
          복원
        </button>
      ) : deletePending ? (
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ display: 'flex', gap: 3 }}>
            <button
              className="btn sm"
              style={{ background: 'var(--negative)', color: '#fff', border: 'none', fontSize: 11 }}
              onClick={onDeleteConfirm}
              disabled={isViewer}
            >
              {isManual && !productCode ? '삭제' : '숨김'}
            </button>
            <button className="btn sm" style={{ fontSize: 11 }} onClick={onDeleteCancel}>
              취소
            </button>
          </span>
          {deletePreview?.allergenLinkCount > 0 && (
            <span style={{ fontSize: 10, color: 'var(--negative)' }}>
              알레르기 링크 {deletePreview.allergenLinkCount}건도 삭제됩니다
            </span>
          )}
        </span>
      ) : (
        <span style={{ display: 'inline-flex', gap: 3 }}>
          {onLinkSubstitute && (
            <button
              className="btn sm"
              aria-label="대체상품 연결"
              title="다른 식자재로 대체 연결(레시피·원가 자동 재연결, 기존 항목 단종)"
              onClick={onLinkSubstitute}
              disabled={isViewer || !productCode}
              style={{ color: 'var(--text-3)' }}
            >
              <Icon.chevRight style={{ width: 13, height: 13 }} />
            </button>
          )}
          {onCopy && (
            <button
              className="btn sm"
              aria-label="복사해서 추가"
              title="이 항목을 복사해 새 식자재 추가"
              onClick={onCopy}
              disabled={isViewer}
              style={{ color: 'var(--text-3)' }}
            >
              <Icon.copy style={{ width: 13, height: 13 }} />
            </button>
          )}
          <button
            className="btn sm"
            aria-label="삭제"
            onClick={onDeleteStart}
            disabled={isViewer}
            style={{ color: 'var(--text-3)' }}
          >
            <Icon.trash style={{ width: 13, height: 13 }} />
          </button>
        </span>
      )}
    </td>
  );
}
