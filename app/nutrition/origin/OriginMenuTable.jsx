import { Icon } from '@/components/icons';
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function OriginMenuTable({ menuRows }) {
  if (menuRows.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon-wrap">
          <Icon.doc style={{ width: 28, height: 28 }} />
        </div>
        <div className="empty-title">표시할 메뉴가 없어요</div>
        <div className="empty-sub">
          식자재에 원산지를 등록하고 메뉴마스터 레시피에 구성품을 추가하면 자동 매칭됩니다
        </div>
      </div>
    );
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>메뉴명</th>
          <th>카테고리</th>
          <th>표시품목 · 원산지</th>
        </tr>
      </thead>
      <tbody>
        {menuRows.map(row => {
          const origins = asObjectArray(row.origins);
          const menuCode = asDisplayText(row.menuCode);
          const menuName = asDisplayText(row.menuName);
          return (
            <tr key={menuCode || menuName}>
              <td style={{ fontWeight: 600 }}>{menuName}</td>
              <td>
                <span className="chip">{asDisplayText(row.category)}</span>
              </td>
              <td>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {origins.map((origin, index) => (
                    <span
                      key={index}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        background: 'var(--surface-2)',
                        borderRadius: 6,
                        padding: '2px 8px',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ color: 'var(--text-2)' }}>
                        {asDisplayText(origin.displayName)}
                      </span>
                      <span style={{ color: 'var(--text-4)' }}>:</span>
                      <span style={{ color: 'var(--text-1)' }}>
                        {asDisplayText(origin.country)}
                      </span>
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
