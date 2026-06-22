import { ReportActivityCell } from './ReportActivityCell';
import { ReportNameCell } from './ReportNameCell';
import { ReportRowActions } from './ReportRowActions';

export function ReportListRow({
  report,
  model,
  editName,
  editInputRef,
  setEditName,
  setEditingId,
  commitEdit,
  startEdit,
  handleToggleFav,
  handleDelete,
  canEdit = false,
  setPreviewTarget,
  setPreviewPrintOnOpen,
  setShareTarget,
}) {
  return (
    <tr
      className={model.isDeleting ? 'deleting' : ''}
      style={
        model.isNew
          ? { background: 'var(--accent-soft)', transition: 'background 2s ease' }
          : undefined
      }
    >
      <td>
        <button
          className={'fav-btn ' + (report.fav ? 'on' : '')}
          disabled={!canEdit}
          onClick={() => {
            if (canEdit) handleToggleFav(report.id, report.fav);
          }}
          aria-label={report.fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          title={report.fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        >
          ★
        </button>
      </td>
      <td className="muted mono" style={{ fontSize: 11 }}>
        {model.displayId}
      </td>
      <ReportNameCell
        report={report}
        model={model}
        editName={editName}
        editInputRef={editInputRef}
        setEditName={setEditName}
        setEditingId={setEditingId}
        commitEdit={commitEdit}
        startEdit={startEdit}
        setPreviewTarget={setPreviewTarget}
        canEdit={canEdit}
      />
      <td>
        <span className="chip" style={{ background: model.chip.bg, color: model.chip.color }}>
          {model.chip.label}
        </span>
      </td>
      <td className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>
        {model.periodLabel}
      </td>
      <td>{model.authorLabel}</td>
      <td className="muted mono" style={{ fontSize: 12 }}>
        {model.createdLabel}
      </td>
      <ReportActivityCell views={model.views} links={model.links} />
      <ReportRowActions
        report={report}
        isDeleting={model.isDeleting}
        handleDelete={handleDelete}
        canEdit={canEdit}
        setPreviewTarget={setPreviewTarget}
        setPreviewPrintOnOpen={setPreviewPrintOnOpen}
        setShareTarget={setShareTarget}
      />
    </tr>
  );
}
