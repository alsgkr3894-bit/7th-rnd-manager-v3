import { Icon } from '@/components/icons';

export function ReportListEmptyState({ reports, setNewReportOpen }) {
  const isEmpty = reports.length === 0;

  return (
    <tr>
      <td colSpan={9}>
        <div className="empty-state" style={{ padding: 48 }}>
          <div className="empty-icon-wrap">
            <Icon.doc style={{ width: 32, height: 32 }} />
          </div>
          <div className="empty-title">
            {isEmpty ? '보고서가 없어요' : '조건에 맞는 보고서가 없어요'}
          </div>
          <div className="empty-sub">
            {isEmpty
              ? '위의 카드에서 원하는 보고서 종류를 선택해 첫 보고서를 생성해보세요.'
              : '필터를 바꾸거나 새 보고서를 생성해보세요.'}
          </div>
          {isEmpty && (
            <button
              className="btn primary"
              style={{ marginTop: 8 }}
              onClick={() => setNewReportOpen(true)}
            >
              <Icon.plus style={{ width: 13, height: 13 }} /> 새 보고서 생성
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
