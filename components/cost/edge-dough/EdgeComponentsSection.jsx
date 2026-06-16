'use client';
import { Icon } from '@/components/icons';
import { FieldLabel } from '@/components/cost/shared/FormLabels';
import { EdgeComponentRow } from './EdgeComponentRow';

export function EdgeComponentsSection({
  components,
  allMeta,
  unitPriceMap,
  errors,
  onPatch,
  onRemove,
  onAdd,
}) {
  return (
    <div>
      <FieldLabel>
        구성품{' '}
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-4)' }}>
          (수량에 −(마이너스) 입력 시 차감 — 예: 기존 도우 빼기)
        </span>
      </FieldLabel>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 90px 72px 110px 90px 28px',
          gap: 6,
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--text-3)',
          paddingBottom: 6,
          borderBottom: '1px solid var(--divider)',
          marginBottom: 4,
        }}
      >
        <div>재료명</div>
        <div style={{ textAlign: 'right' }}>수량</div>
        <div>단위</div>
        <div style={{ textAlign: 'right' }}>단가 (원/단위)</div>
        <div style={{ textAlign: 'right' }}>소계</div>
        <div />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {components.map((component, index) => (
          <EdgeComponentRow
            key={index}
            component={component}
            allMeta={allMeta}
            unitPriceMap={unitPriceMap}
            onChange={patch => onPatch(index, patch)}
            onRemove={() => onRemove(index)}
          />
        ))}
        {components.length === 0 && (
          <div
            style={{
              padding: '20px 0',
              textAlign: 'center',
              color: 'var(--text-3)',
              fontSize: 13,
            }}
          >
            구성품을 추가해주세요
          </div>
        )}
      </div>

      <button type="button" className="btn sm" onClick={onAdd} style={{ marginTop: 8 }}>
        <Icon.plus style={{ width: 13, height: 13 }} /> 구성품 추가
      </button>
      {errors.length > 0 && (
        <div role="alert" style={{ marginTop: 8, fontSize: 12, color: 'var(--negative)' }}>
          {errors[0]}
        </div>
      )}
    </div>
  );
}
