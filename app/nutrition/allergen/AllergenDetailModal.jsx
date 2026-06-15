'use client';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { ALLERGEN_SEED } from '@/lib/nutrition/allergen/store';
import { asDisplayText } from '@/lib/ui/prop-guards';

export function AllergenDetailModal({ detailRow, detailRows, onClose }) {
  if (!detailRow) return null;

  return (
    <ModalFrame
      title={`${asDisplayText(detailRow.menuName)}${detailRow.crust ? ` · ${detailRow.crust}` : ''}`}
      onClose={onClose}
      width="min(760px, 96vw)"
      padding="22px 24px"
      zIndex={300}
    >
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
        {detailRow.kind === 'topping'
          ? '추가토핑 탭에서 연결한 식자재 알레르기입니다.'
          : '직접 레시피, 묶음관리, 엣지관리에서 이 메뉴에 반영된 식자재 알레르기입니다.'}
      </div>
      {detailRows.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 16px' }}>
          <div className="empty-title">상세 식자재가 없습니다</div>
          <div className="empty-sub">알레르기 식자재 매칭 정보를 찾지 못했습니다.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th style={{ width: 140 }}>출처</th>
                <th>식자재명</th>
                <th style={{ width: 110 }}>코드</th>
                <th style={{ width: 110 }}>카테고리</th>
                <th style={{ width: 180 }}>알레르기</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map(row => (
                <tr key={row.key}>
                  <td style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>
                    {row.sourceText}
                  </td>
                  <td style={{ fontWeight: 700 }}>{row.ingredientName}</td>
                  <td className="mono muted">{row.productCode || '—'}</td>
                  <td>{row.category || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {row.allergens.map(code => {
                        const allergen = ALLERGEN_SEED.find(
                          item => asDisplayText(item.allergenCode) === code
                        );
                        return (
                          <span
                            key={code}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 999,
                              background: 'var(--warn-soft)',
                              color: 'var(--warn)',
                            }}
                          >
                            {asDisplayText(allergen?.allergenName, code)}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModalFrame>
  );
}
