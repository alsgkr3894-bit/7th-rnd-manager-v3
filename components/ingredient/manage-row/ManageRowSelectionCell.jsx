export function ManageRowSelectionCell({
  selectable,
  isSelected,
  rowId,
  onToggleSelect,
  disabled = false,
}) {
  return (
    <td style={{ width: 36, textAlign: 'center' }} onClick={event => event.stopPropagation()}>
      {selectable ? (
        <input
          type="checkbox"
          checked={Boolean(isSelected)}
          onChange={() => onToggleSelect?.(rowId)}
          disabled={disabled}
          style={{ cursor: disabled ? 'not-allowed' : 'pointer', width: 15, height: 15 }}
        />
      ) : (
        <span
          style={{ color: 'var(--text-4)', fontSize: 11 }}
          title="아직 등록되지 않은 항목이라 일괄 작업 대상이 아니에요"
        >
          –
        </span>
      )}
    </td>
  );
}
