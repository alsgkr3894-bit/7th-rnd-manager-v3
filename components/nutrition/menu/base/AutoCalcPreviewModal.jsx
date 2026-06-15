'use client';
import { ModalFrame } from '@/components/ui/ModalFrame';
import { asDisplayText } from '@/lib/ui/prop-guards';
import { NUTRITION_FIELDS } from '@/lib/nutrition/values/store';

/**
 * 레시피 기반 자동 계산 결과 미리보기 모달.
 */
export function AutoCalcPreviewModal({
  autoCalcPreview,
  selectedMenuName,
  selCrust,
  saving,
  onApply,
  onClose,
}) {
  return (
    <ModalFrame
      title="레시피 기반 자동 계산 결과"
      onClose={onClose}
      width="min(480px,95vw)"
      zIndex={310}
      padding="24px 28px"
    >
      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--text-1)' }}>{selectedMenuName}</strong> 레시피 재료 기반{' '}
        <strong>100g 기준</strong> 영양성분이에요.
        <br />
        <span style={{ fontSize: 12 }}>
          적용하면 <strong>{selCrust}</strong> 크러스트에 아래 값 + 중량{' '}
          <strong>{asDisplayText(autoCalcPreview.totalGrams, '0')}g</strong>이 입력됩니다.
        </span>
        <br />
        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>
          이 화면은 미리보기이며, 적용 버튼을 누르기 전에는 저장되지 않습니다.
        </span>
      </div>
      {autoCalcPreview.matched < autoCalcPreview.total && (
        <div
          style={{
            marginBottom: 12,
            fontSize: 12,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'var(--warn-soft, #fff4e5)',
            color: 'var(--warn-text, #92600a)',
          }}
        >
          ⚠ 재료 {autoCalcPreview.matched}/{autoCalcPreview.total}개만 영양DB에 매칭됐어요. 나머지는
          계산에서 제외되어 값이 작을 수 있어요.
        </div>
      )}
      {autoCalcPreview.matched === autoCalcPreview.total && (
        <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-4)' }}>
          재료 {autoCalcPreview.matched}/{autoCalcPreview.total}개 전부 매칭됨
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px 12px',
          marginBottom: 16,
        }}
      >
        {NUTRITION_FIELDS.filter(f => f.key !== 'weight').map(f => (
          <div
            key={f.key}
            style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>
              {f.label} <span style={{ color: 'var(--text-4)' }}>({f.unit})</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-text)' }}>
              {autoCalcPreview.values[f.key] ?? '–'}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 16 }}>
        * 재료 100g 기준값 × 사용량을 합산 후 총중량으로 나눠 100g 기준으로 정규화한 값입니다. 중량
        칸도 함께 채워집니다.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>
          취소
        </button>
        <button className="btn primary" onClick={onApply} disabled={saving}>
          {saving ? '적용 중…' : '이 값으로 적용'}
        </button>
      </div>
    </ModalFrame>
  );
}
