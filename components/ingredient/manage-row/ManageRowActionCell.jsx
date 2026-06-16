import { Icon } from '@/components/icons';

export function ManageRowActionCell({
  excluded,
  deletePending,
  isManual,
  productCode,
  onCopy,
  onDeleteStart,
  onDeleteCancel,
  onDeleteConfirm,
  onRestore,
}) {
  return (
    <td style={{ textAlign: 'center' }} onClick={event => event.stopPropagation()}>
      {excluded ? (
        <button className="btn sm" style={{ fontSize: 11 }} onClick={onRestore}>
          복원
        </button>
      ) : deletePending ? (
        <span style={{ display: 'flex', gap: 3 }}>
          <button
            className="btn sm"
            style={{ background: 'var(--negative)', color: '#fff', border: 'none', fontSize: 11 }}
            onClick={onDeleteConfirm}
          >
            {isManual && !productCode ? '삭제' : '숨김'}
          </button>
          <button className="btn sm" style={{ fontSize: 11 }} onClick={onDeleteCancel}>
            취소
          </button>
        </span>
      ) : (
        <span style={{ display: 'inline-flex', gap: 3 }}>
          {onCopy && (
            <button
              className="btn sm"
              aria-label="복사해서 추가"
              title="이 항목을 복사해 새 식자재 추가"
              onClick={onCopy}
              style={{ color: 'var(--text-3)' }}
            >
              <Icon.copy style={{ width: 13, height: 13 }} />
            </button>
          )}
          <button
            className="btn sm"
            aria-label="삭제"
            onClick={onDeleteStart}
            style={{ color: 'var(--text-3)' }}
          >
            <Icon.trash style={{ width: 13, height: 13 }} />
          </button>
        </span>
      )}
    </td>
  );
}
