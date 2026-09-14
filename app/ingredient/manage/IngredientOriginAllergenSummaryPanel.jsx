'use client';
import {
  allergenStateLabel,
  allergenText,
  originStateLabel,
  originText,
} from '@/lib/ingredient/origin-allergen-text';
import { SourceField } from './IngredientFieldPrimitives';

/**
 * 식자재 수정 창 상단 원산지·알레르기 요약 박스.
 * 목록 행에 있던 카드를 여기로 옮겼다 — 폼 상태를 그대로 읽으므로 아래 원산지/알레르기
 * 섹션에서 값을 바꾸면 즉시 반영된다. '원산지 없음'과 '비표기(미표시대상)'는 서로 다른
 * 체크박스라 헷갈리기 쉬워 상태 이름을 그대로 보여준다.
 */
export function IngredientOriginAllergenSummaryPanel({ form }) {
  if (!form) return null;

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
      <div style={{ fontWeight: 700, marginBottom: 8 }}>원산지·알레르기 현황</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '6px 16px',
          fontSize: 12,
          color: 'var(--text-2)',
        }}
      >
        <SourceField label="원산지" value={originText(form) || '미입력'} />
        <SourceField label="원산지 상태" value={originStateLabel(form)} />
        <SourceField label="알레르기" value={allergenText(form) || '미입력'} />
        <SourceField label="알레르기 상태" value={allergenStateLabel(form)} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, fontStyle: 'italic' }}>
        ※ &lsquo;원산지 없음&rsquo;은 원산지 자체가 없음, &lsquo;미표시대상&rsquo;은 출력물에
        표기하지 않음
      </div>
    </div>
  );
}
