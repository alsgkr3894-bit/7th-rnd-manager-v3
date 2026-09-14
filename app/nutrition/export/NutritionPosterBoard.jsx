import {
  BEVERAGE_COLS,
  OriginStatementPoster,
  PizzaPoster150Table,
  PizzaPosterSliceTable,
  SectionTitle,
  SetHalfPosterTable,
  SimplePosterTable,
} from './_posterTables';
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
        <PizzaPoster150Table rows={pizzaSheet} />
        <PizzaPosterSliceTable rows={pizzaSliceSheet} />

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
