import { Icon } from '@/components/icons';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { formatKcalRange } from './format';

const CARD_TITLE_STYLE = { fontSize: 14, fontWeight: 700 };

export function SetCompositionList({ setsWithCalc, onAdd, onEdit, onDelete }) {
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
            피자(자동) + 추가 구성품으로 최소/최대 열량을 산출해요
          </div>
        </div>
        <button type="button" className="btn sm primary" onClick={onAdd}>
          <Icon.plus style={{ width: 13, height: 13 }} />
          세트 추가
        </button>
      </div>

      {setsWithCalc.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 16px' }}>
          <div className="empty-icon-wrap">
            <Icon.box style={{ width: 28, height: 28 }} />
          </div>
          <div className="empty-title">세트 구성이 없어요</div>
          <div className="empty-sub">세트 추가 버튼으로 구성품을 정의하세요</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {setsWithCalc.map((comp, index) => {
            const side = asDisplayText(comp.setSide, 'L') === 'R' ? 'R' : 'L';
            const setName = asDisplayText(comp.setName, `세트 ${index + 1}`);
            const slots = Array.isArray(comp.slots) ? comp.slots : [];
            const slotLabels = slots.map(slot => asDisplayText(slot?.label, '구성품')).join(' + ');

            return (
              <div
                key={comp.id || comp.setCode || setName}
                className="card"
                style={{ padding: 16 }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <div style={CARD_TITLE_STYLE}>
                      {setName} {side}세트
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                      피자 {side} 사이즈 자동 후보{slotLabels ? ` + ${slotLabels}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {side}세트 {formatKcalRange(comp.selectedResult)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-4)' }}>
                        선택 사이즈와 전체 엣지 기준
                      </div>
                    </div>
                    <button type="button" className="btn sm ghost" onClick={() => onEdit(comp)}>
                      <Icon.edit style={{ width: 13, height: 13 }} />
                    </button>
                    <button
                      type="button"
                      className="btn sm ghost"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => onDelete(comp)}
                    >
                      <Icon.trash style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
