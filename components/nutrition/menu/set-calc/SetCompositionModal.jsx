import { Icon } from '@/components/icons';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { calcSetMinMax } from '@/lib/nutrition/values/set-calc';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { formatKcalRange } from './format';
import { SlotEditor } from './SlotEditor';

const SIDES = ['L', 'R'];

export function SetCompositionModal({
  mode,
  form,
  setForm,
  saving,
  allMenus,
  safeMenus,
  safeRawMap,
  safeEdgeMap,
  masterByCode,
  pizzaMenus,
  onClose,
  onAddSlot,
  onRemoveSlot,
  onUpdateSlot,
  onSave,
}) {
  const previewOf = side => {
    const slots = Array.isArray(form[side]?.slots) ? form[side].slots : [];
    return calcSetMinMax(slots, safeMenus, safeRawMap, masterByCode, pizzaMenus, safeEdgeMap)
      .bySize?.[side];
  };

  return (
    <ModalFrame
      title={mode === 'add' ? '세트 추가' : `${asDisplayText(form.setName, '세트')} 편집`}
      onClose={onClose}
      width="min(640px,95vw)"
      zIndex={300}
      padding="24px 28px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label
            style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}
          >
            세트명 *
          </label>
          <input
            className="input"
            value={asDisplayText(form.setName)}
            onChange={event => setForm(current => ({ ...current, setName: event.target.value }))}
            placeholder="예: 피자세트A"
          />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {SIDES.map(side => {
            const sideSlots = Array.isArray(form[side]?.slots) ? form[side].slots : [];
            const preview = previewOf(side);
            return (
              <div
                key={side}
                style={{
                  flex: '1 1 260px',
                  minWidth: 260,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{side}세트</div>
                  {preview?.minKcal != null && (
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {formatKcalRange(preview)}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    background: 'var(--surface-2)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Icon.box
                    style={{ width: 14, height: 14, color: 'var(--accent-text)', flexShrink: 0 }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                    피자 {side} 사이즈와 전체 엣지 기준으로 최저/최고 자동 산출
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: 'var(--text-3)',
                      display: 'block',
                      marginBottom: 6,
                    }}
                  >
                    {side}세트 추가 구성품{' '}
                    <span style={{ color: 'var(--text-4)' }}>(메뉴명·코드로 검색해 추가)</span>
                  </label>
                  {sideSlots.map((slot, index) => (
                    <SlotEditor
                      key={index}
                      slot={slot}
                      allMenus={allMenus}
                      onChange={patch => onUpdateSlot(side, index, patch)}
                      onRemove={() => onRemoveSlot(side, index)}
                    />
                  ))}
                  <button
                    type="button"
                    className="btn sm ghost"
                    onClick={() => onAddSlot(side)}
                    style={{ fontSize: 12, marginTop: 4 }}
                  >
                    <Icon.plus style={{ width: 12, height: 12 }} />
                    구성품 추가
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" className="btn" onClick={onClose}>
          취소
        </button>
        <button type="button" className="btn primary" onClick={onSave} disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </ModalFrame>
  );
}
