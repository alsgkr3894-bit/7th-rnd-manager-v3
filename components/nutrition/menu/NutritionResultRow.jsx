'use client';
import { NUTRITION_FIELDS } from '@/lib/nutrition/values/store';
import { asDisplayText } from '@/lib/ui/prop-guards';

/** 영양성분 결과 테이블의 데이터 행 — 크러스트 배지 + 영양 셀. */
export function NutritionResultRow({ row, isEmpty }) {
  const crustType = asDisplayText(row.crustType, '—');
  const isCheeseCrust = crustType.includes('치즈');
  const isGoldCrust = crustType.includes('골드');
  return (
    <tr style={{ opacity: isEmpty ? 0.35 : 1 }}>
      <td>
        <div style={{ fontWeight: 600 }}>{row.menuName}</div>
        {row.isDerived && (
          <div style={{ fontSize: 11, color: 'var(--text-4)' }}>↳ {row.baseMenuName}</div>
        )}
      </td>
      <td>
        <span
          style={{
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 20,
            background: isCheeseCrust ? '#fff4e0' : isGoldCrust ? '#fff9e0' : 'var(--surface-2)',
            color: isCheeseCrust ? '#b06800' : isGoldCrust ? '#8a7000' : 'var(--text-2)',
          }}
        >
          {crustType}
        </span>
      </td>
      {NUTRITION_FIELDS.map(f => (
        <td key={f.key} className="right">
          {isEmpty ? '—' : (row[f.key] ?? '—')}
        </td>
      ))}
    </tr>
  );
}
