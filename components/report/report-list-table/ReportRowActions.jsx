import { Icon } from '@/components/icons';

export function ReportRowActions({
  report,
  isDeleting,
  handleDelete,
  setPreviewTarget,
  setPreviewPrintOnOpen,
  setShareTarget,
}) {
  return (
    <td>
      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
        <button
          className="btn sm"
          onClick={() => {
            setPreviewPrintOnOpen(false);
            setPreviewTarget(report);
          }}
        >
          미리보기
        </button>
        <button className="btn sm" onClick={() => setShareTarget(report)}>
          <Icon.upload style={{ width: 12, height: 12 }} />
          공유
        </button>
        <button
          className="btn sm"
          onClick={() => {
            setPreviewPrintOnOpen(true);
            setPreviewTarget(report);
          }}
        >
          <Icon.download style={{ width: 12, height: 12 }} />
          PDF
        </button>
        <button
          className="btn sm"
          style={{ color: 'var(--negative)' }}
          disabled={isDeleting}
          onClick={() => handleDelete(report.id)}
        >
          <Icon.x style={{ width: 12, height: 12 }} />
          삭제
        </button>
      </div>
    </td>
  );
}
