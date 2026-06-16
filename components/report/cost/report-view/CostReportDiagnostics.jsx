export function CostReportDiagnostics({ diagnostics }) {
  if (diagnostics.length === 0) return null;

  return (
    <div className="paper-section" style={{ marginTop: 24 }}>
      <div
        className="paper-section-title"
        style={{ borderBottomColor: 'var(--text-3)', color: 'var(--text-2)' }}
      >
        원가 미연결 메뉴 ({diagnostics.length}개)
      </div>
      <table className="paper-table" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th>메뉴명</th>
            <th style={{ width: 90 }}>카테고리</th>
            <th style={{ width: 100 }}>메뉴코드</th>
            <th style={{ width: 120 }}>원인</th>
          </tr>
        </thead>
        <tbody>
          {diagnostics.map((diagnostic, index) => (
            <DiagnosticRow key={`${diagnostic.code}-${index}`} diagnostic={diagnostic} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiagnosticRow({ diagnostic }) {
  return (
    <tr>
      <td>{diagnostic.name}</td>
      <td className="muted">{diagnostic.catLabel}</td>
      <td className="mono muted" style={{ fontSize: 11 }}>
        {diagnostic.code}
      </td>
      <td style={{ color: 'var(--negative)', fontSize: 12, fontWeight: 600 }}>
        {diagnostic.reason}
      </td>
    </tr>
  );
}
