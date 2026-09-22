'use client';

import { CollapsibleCard } from '@/app/note/_CollapsibleCard';
import { useDBLoad } from '@/hooks/useDBLoad';
import { buildNutritionLabelContext } from '@/lib/nutrition/label/context';
import { buildMenuNutritionPreview } from '@/lib/nutrition/label/menu-preview';
import { LABEL_COLS } from '@/lib/nutrition/label/build';

function formatVal(value) {
  if (value === '' || value == null) return '—';
  return String(value);
}

function PreviewTable({ rows, showCrust }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            {showCrust && <th>크러스트</th>}
            {showCrust && <th>사이즈</th>}
            {LABEL_COLS.map(col => (
              <th key={col.key}>
                {col.label}
                {col.unit ? ` (${col.unit})` : ''}
              </th>
            ))}
            <th>알레르기</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {showCrust && <td>{row.crustLabel}</td>}
              {showCrust && <td>{row.side}</td>}
              {LABEL_COLS.map(col => (
                <td key={col.key}>{formatVal(row[col.key])}</td>
              ))}
              <td>{formatVal(row.allergen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MenuNutritionPreview({ menuCode, menuName, category, edgeKey, size }) {
  const { data: ctx, loading, error } = useDBLoad(buildNutritionLabelContext);

  const preview = ctx
    ? buildMenuNutritionPreview(ctx, { menuCode, menuName, category, edgeKey, size })
    : null;

  return (
    <CollapsibleCard title="영양성분 출력 미리보기" subtitle="실제 라벨 출력에 나가는 값 그대로">
      {loading && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>불러오는 중…</div>}
      {!loading && error && (
        <div style={{ fontSize: 12, color: 'var(--negative)' }}>불러오기 실패: {error.message}</div>
      )}
      {!loading && !error && preview && !preview.supported && (
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {category === '엣지' ? (
            <>
              엣지는 별도의 영양성분 출력 행이 없고, 이 값이 각 피자 메뉴의 출력 행에 합산돼
              반영됩니다.{' '}
            </>
          ) : (
            <>
              세트박스·하프앤하프는 여러 메뉴를 합산한 범위로 계산되어 메뉴 단위 미리보기를 지원하지
              않습니다.{' '}
            </>
          )}
          <a href="/nutrition/export" target="_blank" rel="noreferrer">
            전체 출력 페이지에서 확인
          </a>
        </div>
      )}
      {!loading && !error && preview?.supported && preview.missing && (
        <div style={{ fontSize: 12, color: 'var(--warn)' }}>
          영양성분 값이 아직 입력되지 않았습니다.{' '}
          <a href="/nutrition/menu" target="_blank" rel="noreferrer">
            영양성분 입력하러 가기
          </a>
        </div>
      )}
      {!loading && !error && preview?.supported && !preview.missing && (
        <>
          {preview.note && (
            <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 6 }}>
              {preview.note}
            </div>
          )}
          <PreviewTable
            rows={preview.rows}
            showCrust={preview.group === '피자' || preview.group === '엣지'}
          />
        </>
      )}
    </CollapsibleCard>
  );
}
