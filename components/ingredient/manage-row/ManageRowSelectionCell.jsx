export function ManageRowSelectionCell({ deletable, isSelected, rowId, onToggleSelect }) {
  return (
    <td style={{ width: 36, textAlign: 'center' }} onClick={event => event.stopPropagation()}>
      {deletable ? (
        <input
          type="checkbox"
          checked={Boolean(isSelected)}
          onChange={() => onToggleSelect?.(rowId)}
          style={{ cursor: 'pointer', width: 15, height: 15 }}
        />
      ) : (
        <span
          style={{ color: 'var(--text-4)', fontSize: 11 }}
          title="제때 연동 항목은 일괄 삭제 대상이 아니에요"
        >
          –
        </span>
      )}
    </td>
  );
}
