'use client';
import { Icon } from '@/components/icons';
import { formatNumber } from '@/lib/format';

/**
 * 단순 종합 원가표 — 1메뉴=1행 (엣지 매트릭스 아님).
 * 1인피자 / 사이드 / 세트박스 / 종합전메뉴 등에서 재사용.
 *
 * @prop rows   [{ menuCode, menuName, size?, price, cost, rate, empty? }]
 * @prop showSize  규격 컬럼 표시 여부 (1인피자는 false)
 */
export function SimpleSummaryTable({ rows, showSize = false }) {
  if (!rows?.length) {
    return (
      <div className="card" style={{ minHeight: 160, display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          <Icon.calc style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>표시할 메뉴가 없습니다</div>
          <div style={{ fontSize: 13 }}>메뉴 판매가에서 먼저 등록해주세요.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card table-card">
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 100 }}>메뉴코드</th>
              <th>메뉴명</th>
              {showSize && <th style={{ width: 60 }}>규격</th>}
              <th style={{ width: 110, textAlign: 'right' }}>판매가</th>
              <th style={{ width: 110, textAlign: 'right' }}>원가</th>
              <th style={{ width: 90, textAlign: 'right' }}>원가율</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isRisk = r.rate != null && r.rate >= 35;
              const isWarn = r.rate != null && r.rate >= 30 && r.rate < 35;
              const color = isRisk ? 'var(--negative)' : isWarn ? 'var(--warn)' : 'var(--text-1)';
              return (
                <tr key={r.menuCode}>
                  <td
                    style={{
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      fontSize: 11,
                      color: 'var(--text-3)',
                    }}
                  >
                    {r.menuCode}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{r.menuName}</td>
                  {showSize && (
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.size || '단일'}</td>
                  )}
                  <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
                    {r.price != null ? (
                      <>
                        {formatNumber(r.price)}
                        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 2 }}>
                          원
                        </span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-4)' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {r.cost > 0 ? (
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>
                        {formatNumber(r.cost)}
                        <span
                          style={{ fontSize: 11, fontWeight: 500, marginLeft: 2, opacity: 0.7 }}
                        >
                          원
                        </span>
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-4)', fontStyle: 'italic' }}>
                        미입력
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {r.rate != null ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>
                        {r.rate.toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        style={{
          padding: '10px 16px',
          fontSize: 11,
          color: 'var(--text-3)',
          borderTop: '1px solid var(--divider)',
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span>
          <span style={{ color: 'var(--negative)' }}>●</span> 원가율 35%↑ 위험
        </span>
        <span>
          <span style={{ color: 'var(--warn)' }}>●</span> 30~35% 주의
        </span>
      </div>
    </div>
  );
}
