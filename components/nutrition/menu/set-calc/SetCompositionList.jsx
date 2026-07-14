import { Icon } from '@/components/icons';
import { asDisplayText, asObjectArray, asStringArray } from '@/lib/ui/prop-guards';
import { formatKcalRange } from './format';

const CARD_TITLE_STYLE = { fontSize: 14, fontWeight: 700 };
const SIDES = ['L', 'R'];

/** 슬롯의 menuCodes를 메뉴명으로 바꾸고, 부분 수량(qty/baseQty)이 있으면 ×qty/baseQty를 붙인다. */
function slotDisplayText(slot, nameByCode) {
  const names = asStringArray(slot?.menuCodes)
    .map(code => nameByCode[code] || code)
    .filter(Boolean)
    .join('/');
  if (!names) return '';
  const qty = parseFloat(slot?.qty);
  const baseQty = parseFloat(slot?.baseQty);
  const hasRatio = !isNaN(qty) && qty > 0 && !isNaN(baseQty) && baseQty > 0;
  return hasRatio ? `${names} ×${qty}/${baseQty}` : names;
}

export function SetCompositionList({ groups, menus, onAdd, onEdit, onDelete, canEdit = false }) {
  const nameByCode = Object.fromEntries(
    asObjectArray(menus).map(m => [asDisplayText(m.menuCode), asDisplayText(m.menuName, m.menuCode)])
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <div>
          <div style={CARD_TITLE_STYLE}>세트박스</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            L세트·R세트 각각 피자(자동) + 추가 구성품으로 최소/최대 열량을 산출해요
          </div>
        </div>
        <button type="button" className="btn sm primary" onClick={onAdd} disabled={!canEdit}>
          <Icon.plus style={{ width: 13, height: 13 }} />
          세트 추가
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 16px' }}>
          <div className="empty-icon-wrap">
            <Icon.box style={{ width: 28, height: 28 }} />
          </div>
          <div className="empty-title">세트 구성이 없어요</div>
          <div className="empty-sub">세트 추가 버튼으로 구성품을 정의하세요</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map((group, index) => {
            const setName = asDisplayText(group.setName, `세트 ${index + 1}`);

            return (
              <div key={setName} className="card" style={{ padding: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={CARD_TITLE_STYLE}>{setName}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() => onEdit(group)}
                      disabled={!canEdit}
                    >
                      <Icon.edit style={{ width: 13, height: 13 }} />
                    </button>
                    <button
                      type="button"
                      className="btn sm ghost"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => onDelete(group)}
                      disabled={!canEdit}
                    >
                      <Icon.trash style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                  {SIDES.map(side => {
                    const comp = group[side];
                    const slots = comp && Array.isArray(comp.slots) ? comp.slots : [];
                    const slotLabels = slots
                      .map(slot => slotDisplayText(slot, nameByCode))
                      .filter(Boolean)
                      .join(' + ');
                    return (
                      <div key={side} style={{ flex: '1 1 200px', minWidth: 200 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{side}세트</div>
                        <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                          피자 {side} 사이즈 자동 후보{slotLabels ? ` + ${slotLabels}` : ''}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                          {comp ? formatKcalRange(comp.selectedResult) : '미구성'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
