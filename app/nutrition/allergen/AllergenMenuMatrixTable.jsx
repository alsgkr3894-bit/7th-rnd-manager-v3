'use client';
import { Icon } from '@/components/icons';
import { asDisplayText } from '@/lib/ui/prop-guards';

export function AllergenMenuMatrixTable({ menuMatrix, orderedAllergens, onDetailRow }) {
  if (menuMatrix.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon-wrap">
          <Icon.doc style={{ width: 28, height: 28 }} />
        </div>
        <div className="empty-title">표시할 메뉴가 없어요</div>
        <div className="empty-sub">
          식자재에 알레르기를 등록하고 메뉴마스터 레시피에 구성품을 추가하면 자동 매칭됩니다
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 400px)',
        minHeight: 300,
      }}
    >
      <table className="data-table" style={{ minWidth: 900 }}>
        <thead>
          <tr>
            <th
              style={{
                minWidth: 160,
                position: 'sticky',
                left: 0,
                top: 0,
                background: 'var(--surface-2)',
                zIndex: 4,
              }}
            >
              메뉴명
            </th>
            <th
              style={{
                width: 80,
                position: 'sticky',
                top: 0,
                background: 'var(--surface-2)',
                zIndex: 2,
              }}
            >
              카테고리
            </th>
            {orderedAllergens.map(al => (
              <th
                key={al.allergenCode}
                style={{
                  width: 46,
                  fontSize: 11,
                  textAlign: 'center',
                  padding: '8px 2px',
                  wordBreak: 'keep-all',
                  lineHeight: 1.3,
                  position: 'sticky',
                  top: 0,
                  background: 'var(--surface-2)',
                  zIndex: 2,
                }}
              >
                {al.allergenName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {menuMatrix.map((row, i) => {
            const rowKey =
              asDisplayText(row.rowKey) ||
              asDisplayText(row.menuCode) ||
              asDisplayText(row.menuName);
            const crust = asDisplayText(row.crust);
            const allergenCodes = row.allergenCodes instanceof Set ? row.allergenCodes : new Set();
            const groupKey = item =>
              asDisplayText(item.menuCode) ||
              asDisplayText(item.originalMenuName) ||
              asDisplayText(item.menuName);
            const next = menuMatrix[i + 1];
            const isLastInGroup = !next || groupKey(next) !== groupKey(row);

            return (
              <tr
                key={rowKey}
                style={isLastInGroup ? { borderBottom: '2px solid var(--text-3)' } : undefined}
              >
                <td
                  style={{
                    fontWeight: 600,
                    position: 'sticky',
                    left: 0,
                    background: 'var(--surface)',
                    zIndex: 1,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onDetailRow(row)}
                    style={{
                      border: 0,
                      background: 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      font: 'inherit',
                      color: 'inherit',
                      textAlign: 'left',
                    }}
                    title="식자재 알레르기 상세 보기"
                  >
                    {asDisplayText(row.menuName)}
                    {crust && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 999,
                          background: 'var(--surface-3)',
                          color: 'var(--text-2)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {crust}
                      </span>
                    )}
                  </button>
                </td>
                <td>
                  <span className="chip">{asDisplayText(row.category)}</span>
                </td>
                {orderedAllergens.map(al => {
                  const allergenCode = asDisplayText(al.allergenCode);
                  const has = allergenCodes.has(allergenCode);
                  return (
                    <td key={allergenCode} style={{ textAlign: 'center' }}>
                      {has ? (
                        <span
                          style={{
                            display: 'inline-block',
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: 'var(--accent)',
                          }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
