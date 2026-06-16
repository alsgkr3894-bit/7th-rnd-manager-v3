import { Icon } from '@/components/icons';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { calcSetMinMax } from '@/lib/nutrition/values/set-calc';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { formatKcalRange } from './format';
import { SlotEditor } from './SlotEditor';

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
  const preview = calcSetMinMax(
    Array.isArray(form.slots) ? form.slots : [],
    safeMenus,
    safeRawMap,
    masterByCode,
    pizzaMenus,
    safeEdgeMap
  );
  const side = asDisplayText(form.setSide, 'L') === 'R' ? 'R' : 'L';
  const sidePreview = preview.bySize?.[side];

  return (
    <ModalFrame
      title={mode === 'add' ? '세트 추가' : `${asDisplayText(form.setName, '세트')} 편집`}
      onClose={onClose}
      width="min(520px,95vw)"
      zIndex={300}
      padding="24px 28px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

        <div>
          <label
            style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}
          >
            세트 구분 *
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['L', 'R'].map(size => (
              <button
                key={size}
                type="button"
                className={`btn sm${side === size ? ' primary' : ''}`}
                onClick={() => setForm(current => ({ ...current, setSide: size }))}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {size}세트
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface-2)',
            borderRadius: 8,
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon.box style={{ width: 14, height: 14, color: 'var(--accent-text)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>피자</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
              선택한 {side} 사이즈와 전체 엣지 기준으로 최저/최고 피자 자동 산출
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-4)',
              background: 'var(--surface)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            자동
          </span>
        </div>

        <div>
          <label
            style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}
          >
            추가 구성품 <span style={{ color: 'var(--text-4)' }}>(메뉴명·코드로 검색해 추가)</span>
          </label>
          {(Array.isArray(form.slots) ? form.slots : []).map((slot, index) => (
            <SlotEditor
              key={index}
              slot={slot}
              allMenus={allMenus}
              onChange={patch => onUpdateSlot(index, patch)}
              onRemove={() => onRemoveSlot(index)}
            />
          ))}
          <button
            type="button"
            className="btn sm ghost"
            onClick={onAddSlot}
            style={{ fontSize: 12, marginTop: 4 }}
          >
            <Icon.plus style={{ width: 12, height: 12 }} />
            구성품 추가
          </button>
        </div>

        {sidePreview?.minKcal != null && (
          <div
            style={{
              background: 'var(--surface-2)',
              borderRadius: 8,
              padding: '10px 12px',
              display: 'flex',
              gap: 16,
              fontSize: 12,
            }}
          >
            <span style={{ color: 'var(--text-3)' }}>미리보기</span>
            <span>
              {side}세트 <strong>{formatKcalRange(sidePreview)}</strong>
            </span>
          </div>
        )}
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
