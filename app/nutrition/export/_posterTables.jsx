/**
 * app/nutrition/export/_posterTables.jsx — 사이드·음료 단순 표, 세트/하프앤하프 표, 원산지 문구
 */
import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import {
  compactRows,
  displayNutritionMenuName,
  nutritionValue,
  splitSetHalfRows,
} from '@/lib/nutrition/label/poster';
import { CellText, EmptyRow, SIMPLE_COLS, SectionTitle } from './_posterPrimitives';

export { BEVERAGE_COLS, SIMPLE_COLS, SectionTitle } from './_posterPrimitives';
export { PizzaPoster150Table, PizzaPosterSliceTable } from './_posterPizzaTables';

export function SimplePosterTable({
  title,
  rows,
  cols = SIMPLE_COLS,
  limit,
  className = '',
  nameHeader = '메뉴명',
}) {
  const allRows = asObjectArray(rows);
  const safeRows = compactRows(rows, limit);
  const hidden = allRows.length - safeRows.length;
  return (
    <section className={`nutrition-poster-section ${className}`}>
      <SectionTitle>{title}</SectionTitle>
      <table className="nutrition-poster-table nutrition-poster-simple-table">
        <thead>
          <tr>
            <th>{nameHeader}</th>
            {cols.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th>함유된 알레르기 유발물질</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.length ? (
            <>
              {safeRows.map((row, index) => (
                <tr
                  key={`${asDisplayText(row?.menuCode) || asDisplayText(row?.menuName)}-${index}`}
                >
                  <td className="poster-menu-name small">
                    <CellText>{displayNutritionMenuName(row?.menuName)}</CellText>
                  </td>
                  {cols.map(col => (
                    <td key={col.key} className="poster-num">
                      <CellText>{row?.[col.key]}</CellText>
                    </td>
                  ))}
                  <td className="poster-allergen">
                    <CellText>{row?.allergen}</CellText>
                  </td>
                </tr>
              ))}
              {hidden > 0 && (
                <tr>
                  <td
                    colSpan={cols.length + 2}
                    style={{ textAlign: 'center', color: '#999', fontStyle: 'italic' }}
                  >
                    외 {hidden}건 (전체 {allRows.length}건) — 전체 목록은 엑셀·카테고리 표에서 확인
                  </td>
                </tr>
              )}
            </>
          ) : (
            <EmptyRow colSpan={cols.length + 2} />
          )}
        </tbody>
      </table>
    </section>
  );
}

export function SetHalfPosterTable({ title, rows }) {
  const safeRows = asObjectArray(rows);
  return (
    <section className="nutrition-poster-section">
      <SectionTitle>{title}</SectionTitle>
      <table className="nutrition-poster-table nutrition-poster-simple-table">
        <thead>
          <tr>
            <th>메뉴명</th>
            <th>사이즈</th>
            <th>최소 열량(kcal)</th>
            <th>최대 열량(kcal)</th>
            <th>1회 중량(g)</th>
          </tr>
        </thead>
        <tbody>
          {safeRows.length ? (
            safeRows.map((row, index) => (
              <tr key={`${asDisplayText(row?.menuName)}-${index}`}>
                <td className="poster-menu-name small">
                  <CellText>{displayNutritionMenuName(row?.menuName)}</CellText>
                </td>
                <td className="poster-num">
                  <CellText>{row?.side}</CellText>
                </td>
                <td className="poster-num">
                  <CellText>{row?.minKcal}</CellText>
                </td>
                <td className="poster-num">
                  <CellText>{row?.maxKcal}</CellText>
                </td>
                <td className="poster-num">
                  <CellText>{row?.weight}</CellText>
                </td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={5} />
          )}
        </tbody>
      </table>
    </section>
  );
}

export function OriginStatementPoster({ rows }) {
  const safeRows = compactRows(rows, 12);
  return (
    <section className="nutrition-poster-section nutrition-poster-origin-box">
      <SectionTitle>원산지</SectionTitle>
      <div className="nutrition-poster-origin-lines">
        {safeRows.length ? (
          safeRows.map((row, index) => (
            <p key={`${asDisplayText(row?.names)}-${index}`}>
              <strong>{asDisplayText(row?.names)}</strong>
              <span>({asDisplayText(row?.breakdown)})</span>
            </p>
          ))
        ) : (
          <p>식자재 관리의 원산지 등록 후 자동 표시됩니다.</p>
        )}
      </div>
    </section>
  );
}
