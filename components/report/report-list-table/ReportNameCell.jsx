import { showToast } from '@/components/Toast';
import { asDisplayText } from '@/lib/ui/prop-guards';

export function ReportNameCell({
  report,
  model,
  editName,
  editInputRef,
  setEditName,
  setEditingId,
  commitEdit,
  startEdit,
  setPreviewTarget,
  canEdit = false,
}) {
  return (
    <td className="cell-name">
      {model.isEditing ? (
        <input
          ref={editInputRef}
          className="input"
          style={{ fontSize: 13, padding: '4px 8px', width: '100%' }}
          value={editName}
          disabled={!canEdit}
          onChange={event => setEditName(event.target.value)}
          onBlur={() => commitEdit(report)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              commitEdit(report);
            }
            if (event.key === 'Escape') {
              const nextName = asDisplayText(editName).trim();
              if (nextName && nextName !== model.originalName) {
                showToast('변경사항이 취소됐어요', 'warn');
              }
              setEditingId(null);
            }
          }}
        />
      ) : (
        <button
          className="report-name-btn"
          onClick={() => setPreviewTarget(report)}
          onDoubleClick={() => {
            if (canEdit) startEdit(report);
          }}
          title={canEdit ? '더블클릭으로 이름 편집' : '미리보기'}
        >
          {model.reportName}
        </button>
      )}
    </td>
  );
}
