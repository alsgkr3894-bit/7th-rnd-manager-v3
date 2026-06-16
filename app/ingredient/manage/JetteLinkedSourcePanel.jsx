'use client';
import { formatNumber } from '@/lib/format';
import { SCOPE } from '@/lib/ingredient/constants';
import { SourceField } from './IngredientFieldPrimitives';

export function JetteLinkedSourcePanel({ ingredient }) {
  if (!ingredient) return null;

  const scopeLabel = ingredient.scope || (ingredient.hasRecord ? SCOPE.EXCLUSIVE : SCOPE.GENERIC);

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 16,
        fontSize: 13,
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: 700 }}>{ingredient.productName}</div>
        <span
          className="chip"
          style={{
            padding: '2px 8px',
            fontSize: 11,
            background: 'var(--accent-soft)',
            color: 'var(--accent-text)',
          }}
        >
          {scopeLabel}
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '6px 16px',
          fontSize: 12,
          color: 'var(--text-2)',
        }}
      >
        <SourceField label="제품코드" value={ingredient.productCode} />
        <SourceField label="온도" value={ingredient.temperature} />
        <SourceField label="판매단위" value={ingredient.salesUnit} />
        <SourceField label="과세구분" value={ingredient.taxType} />
        <SourceField
          label="부가세포함단가"
          value={
            ingredient.priceWithTax != null ? `${formatNumber(ingredient.priceWithTax)}원` : null
          }
        />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, fontStyle: 'italic' }}>
        ※ 위 값들은 제때 가격파일에서 자동 가져옵니다 (수정 불가)
      </div>
    </div>
  );
}
