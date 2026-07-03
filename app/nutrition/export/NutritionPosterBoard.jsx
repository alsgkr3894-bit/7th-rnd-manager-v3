import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';
import {
  buildPosterPizzaRows,
  compactRows,
  displayNutritionMenuName,
  formatNutritionPosterMonth,
  nutritionValue,
  pairAllergen,
  pair150Value,
  pairValue,
  splitSetHalfRows,
  splitSideAndPastaRows,
} from '@/lib/nutrition/label/poster';

const PIZZA_150_GROUPS = [
  { label: '1회 중량(g)', key: 'weight' },
  { label: '열량(kcal/150g)', key: 'kcal' },
  { label: '당류(g/150g)', key: 'sugar' },
  { label: '단백질(g/150g)', key: 'protein' },
  { label: '포화지방(g/150g)', key: 'fat' },
  { label: '나트륨(mg/150g)', key: 'sodium' },
];

const PIZZA_SLICE_GROUPS = [
  { label: '1회 조각수', key: 'servingLabel' },
  { label: '총 조각중량(g)', key: 'totalWeight' },
  { label: '조각 중량(g)', key: 'weight' },
  { label: '열량(kcal/조각)', key: 'kcal' },
  { label: '당류(g/조각)', key: 'sugar' },
  { label: '단백질(g/조각)', key: 'protein' },
  { label: '포화지방(g/조각)', key: 'fat' },
  { label: '나트륨(mg/조각)', key: 'sodium' },
];

const SIMPLE_COLS = [
  { label: '1회 중량(g)', key: 'weight' },
  { label: '열량(kcal/1회분)', key: 'kcal' },
  { label: '당류(g/1회분)', key: 'sugar' },
  { label: '단백질(g/1회분)', key: 'protein' },
  { label: '포화지방(g/1회분)', key: 'fat' },
  { label: '나트륨(mg/1회분)', key: 'sodium' },
];

const BEVERAGE_COLS = [
  { label: '총량(ml)', key: 'weight' },
  ...SIMPLE_COLS.slice(1),
];

function CellText({ children }) {
  return <>{nutritionValue(children)}</>;
}

function SectionTitle({ children }) {
  return <div className="nutrition-poster-section-title">{children}</div>;
}

function EmptyRow({ colSpan, label = '데이터 없음' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="poster-empty-cell">
        {label}
      </td>
    </tr>
  );
}

function PizzaPosterTable({ sliceRows, rows150 }) {
  const posterRows = buildPosterPizzaRows(sliceRows, rows150);
  return (
    <section className="nutrition-poster-main-section">
      <table className="nutrition-poster-table nutrition-poster-pizza-table">
        <thead>
          <tr>
            <th rowSpan="3" className="poster-pizza-label">
              Pizza
            </th>
            <th rowSpan="3">크러스트</th>
            <th colSpan={PIZZA_150_GROUPS.length * 2}>150g 기준</th>
            <th colSpan={PIZZA_SLICE_GROUPS.length * 2}>조각 기준</th>
            <th rowSpan="3">함유된 알레르기 유발물질</th>
          </tr>
          <tr>
            {[...PIZZA_150_GROUPS, ...PIZZA_SLICE_GROUPS].map(group => (
              <th key={`${group.key}-${group.label}`} colSpan="2">
                {group.label}
              </th>
            ))}
          </tr>
          <tr>
            {[...PIZZA_150_GROUPS, ...PIZZA_SLICE_GROUPS].flatMap(group => [
              <th key={`${group.key}-${group.label}-L`}>L</th>,
              <th key={`${group.key}-${group.label}-R`}>R</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {posterRows.length ? (
            posterRows.map((row, index) => (
              <tr key={`${row.menuName}-${row.crustLabel}-${index}`}>
                {row.firstOfMenu && (
                  <td rowSpan={row.rowSpan} className="poster-menu-name">
                    <CellText>{row.menuName}</CellText>
                  </td>
                )}
                <td className="poster-crust-name">
                  <CellText>{row.crustLabel}</CellText>
                </td>
                {PIZZA_150_GROUPS.flatMap(group => [
                  <td key={`150-${group.key}-L`} className="poster-num">
                    <CellText>{pair150Value(row, group.key, 'L')}</CellText>
                  </td>,
                  <td key={`150-${group.key}-R`} className="poster-num">
                    <CellText>{pair150Value(row, group.key, 'R')}</CellText>
                  </td>,
                ])}
                {PIZZA_SLICE_GROUPS.flatMap(group => [
                  <td key={`slice-${group.key}-L`} className="poster-num">
                    <CellText>{pairValue(row, group.key, 'L')}</CellText>
                  </td>,
                  <td key={`slice-${group.key}-R`} className="poster-num">
                    <CellText>{pairValue(row, group.key, 'R')}</CellText>
                  </td>,
                ])}
                <td className="poster-allergen">
                  <CellText>{pairAllergen(row)}</CellText>
                </td>
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={31} label="피자 영양성분 데이터가 없습니다" />
          )}
        </tbody>
      </table>
    </section>
  );
}

function SimplePosterTable({
  title,
  rows,
  cols = SIMPLE_COLS,
  limit,
  className = '',
  nameHeader = '메뉴명',
}) {
  const safeRows = compactRows(rows, limit);
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
            safeRows.map((row, index) => (
              <tr key={`${asDisplayText(row?.menuCode) || asDisplayText(row?.menuName)}-${index}`}>
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
            ))
          ) : (
            <EmptyRow colSpan={cols.length + 2} />
          )}
        </tbody>
      </table>
    </section>
  );
}

function SetHalfPosterTable({ title, rows }) {
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

function OriginStatementPoster({ rows }) {
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

export function NutritionPosterBoard({
  pizzaSheet,
  pizzaSliceSheet,
  toppingSheet,
  sideSheet,
  setHalfSheet,
  beverageSheet,
  originStatementSheet,
}) {
  const { sideRows, pastaRows } = splitSideAndPastaRows(sideSheet);
  const { setRows, halfRows } = splitSetHalfRows(setHalfSheet);

  return (
    <div className="nutrition-poster-preview">
      <article className="nutrition-poster-sheet" aria-label="제품 영양성분 원산지 통합표">
        <PizzaPosterTable sliceRows={pizzaSliceSheet} rows150={pizzaSheet} />

        <SimplePosterTable title="추가 토핑" rows={toppingSheet} className="poster-topping" />

        <div className="nutrition-poster-bottom-grid">
          <div className="nutrition-poster-bottom-left">
            <SimplePosterTable title="Side" rows={sideRows} limit={10} />
            <SimplePosterTable title="Pasta" rows={pastaRows} limit={4} />
          </div>
          <div className="nutrition-poster-bottom-center">
            <SetHalfPosterTable title="Set Box" rows={setRows} />
            <SetHalfPosterTable title="하프앤하프" rows={halfRows} />
            <OriginStatementPoster rows={originStatementSheet} />
          </div>
          <div className="nutrition-poster-bottom-right">
            <SimplePosterTable title="Beverage" rows={beverageSheet} cols={BEVERAGE_COLS} />
            <div className="nutrition-poster-notice">
              <p>1. 위 제품은 재료의 수급 상황에 따라 구성 성분이 다소 차이가 날 수 있습니다.</p>
              <p>2. 위 영양 성분 표는 제품의 중량으로, 실제 제공 시와 차이가 날 수 있습니다.</p>
              <p>3. 위 영양 성분 수치는 설정 방법에 따라 차이가 날 수 있습니다.</p>
              <p>4. 위 원산지 내용은 현지 사정에 따라 다소 변경될 수 있습니다.</p>
            </div>
          </div>
        </div>

        <footer className="nutrition-poster-footer">{formatNutritionPosterMonth()}</footer>
      </article>
    </div>
  );
}
