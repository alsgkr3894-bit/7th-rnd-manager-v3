/**
 * app/nutrition/export/_posterPizzaTables.jsx — 피자 포스터 표(150g 기준 / 조각 기준)
 */
import { asObjectArray } from '@/lib/ui/prop-guards';
import {
  buildPosterPizzaRows,
  displayNutritionMenuName,
  pairAllergen,
  pair150Value,
  pairValue,
} from '@/lib/nutrition/label/poster';
import {
  CellText,
  EmptyRow,
  PIZZA_150_GROUPS,
  PIZZA_SLICE_GROUPS,
  SectionTitle,
} from './_posterPrimitives';

export function PizzaPoster150Table({ rows }) {
  const posterRows = buildPosterPizzaRows([], rows);
  return (
    <section className="nutrition-poster-main-section">
      <table className="nutrition-poster-table nutrition-poster-pizza-table">
        <thead>
          <tr>
            <th rowSpan="2" className="poster-pizza-label">
              메뉴명
            </th>
            <th rowSpan="2">크러스트</th>
            <th colSpan={PIZZA_150_GROUPS.length * 2}>150g 기준</th>
            <th rowSpan="2">함유된 알레르기 유발물질</th>
          </tr>
          <tr>
            {PIZZA_150_GROUPS.flatMap(group => [
              <th key={`${group.key}-L`}>{group.label} L</th>,
              <th key={`${group.key}-R`}>{group.label} R</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {posterRows.length ? (
            posterRows.map((row, index) => (
              <tr key={`${row.menuName}-${row.crustLabel}-150-${index}`}>
                <td className="poster-menu-name">
                  <CellText>{row.menuName}</CellText>
                </td>
                <td className="poster-crust-name">
                  <CellText>{row.crustLabel}</CellText>
                </td>
                {PIZZA_150_GROUPS.flatMap(group => [
                  <td key={`${group.key}-L`} className="poster-num">
                    <CellText>{pair150Value(row, group.key, 'L')}</CellText>
                  </td>,
                  <td key={`${group.key}-R`} className="poster-num">
                    <CellText>{pair150Value(row, group.key, 'R')}</CellText>
                  </td>,
                ])}
                <td className="poster-allergen">
                  <CellText>{pairAllergen(row)}</CellText>
                </td>
              </tr>
            ))
          ) : (
            <EmptyRow
              colSpan={PIZZA_150_GROUPS.length * 2 + 3}
              label="피자 150g 기준 영양성분 데이터가 없습니다"
            />
          )}
        </tbody>
      </table>
    </section>
  );
}

export function PizzaPosterSliceTable({ rows }) {
  const posterRows = buildPosterPizzaRows(rows, []);
  return (
    <section className="nutrition-poster-main-section">
      <table className="nutrition-poster-table nutrition-poster-pizza-table">
        <thead>
          <tr>
            <th rowSpan="2" className="poster-pizza-label">
              메뉴명
            </th>
            <th rowSpan="2">크러스트</th>
            <th colSpan={PIZZA_SLICE_GROUPS.length * 2}>조각 기준</th>
            <th rowSpan="2">함유된 알레르기 유발물질</th>
          </tr>
          <tr>
            {PIZZA_SLICE_GROUPS.flatMap(group => [
              <th key={`${group.key}-L`}>{group.label} L</th>,
              <th key={`${group.key}-R`}>{group.label} R</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {posterRows.length ? (
            posterRows.map((row, index) => (
              <tr key={`${row.menuName}-${row.crustLabel}-slice-${index}`}>
                <td className="poster-menu-name">
                  <CellText>{row.menuName}</CellText>
                </td>
                <td className="poster-crust-name">
                  <CellText>{row.crustLabel}</CellText>
                </td>
                {PIZZA_SLICE_GROUPS.flatMap(group => [
                  <td key={`${group.key}-L`} className="poster-num">
                    <CellText>{pairValue(row, group.key, 'L')}</CellText>
                  </td>,
                  <td key={`${group.key}-R`} className="poster-num">
                    <CellText>{pairValue(row, group.key, 'R')}</CellText>
                  </td>,
                ])}
                <td className="poster-allergen">
                  <CellText>{pairAllergen(row)}</CellText>
                </td>
              </tr>
            ))
          ) : (
            <EmptyRow
              colSpan={PIZZA_SLICE_GROUPS.length * 2 + 3}
              label="피자 조각 기준 영양성분 데이터가 없습니다"
            />
          )}
        </tbody>
      </table>
    </section>
  );
}
