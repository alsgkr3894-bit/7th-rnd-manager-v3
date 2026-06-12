'use client';
import { pizzaBaseCost, pizzaIssues } from '@/lib/cost/pizza-detail';
import { CostDetailCardBase } from '@/components/cost/shared/CostDetailCardBase';

/**
 * 피자 메뉴 1개의 세부 원가 카드.
 *
 * @prop menu    { menuCode, menuName, size, price? } (메뉴 판매가에서 가져온 정보)
 * @prop recipe  cost_pizza_detail 레코드 (없으면 null)
 * @prop onEdit  () => void
 */
export function PizzaDetailCard({ menu, recipe, onEdit }) {
  return (
    <CostDetailCardBase
      menu={menu}
      recipe={recipe}
      onEdit={onEdit}
      title={`${menu.menuName} ${menu.size}`}
      totalCost={pizzaBaseCost(recipe)}
      issues={recipe ? pizzaIssues(recipe) : []}
      metricLabel="베이스 원가 (엣지 제외)"
      rateLabel="베이스율"
    />
  );
}
