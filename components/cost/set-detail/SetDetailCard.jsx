'use client';
import { setTotalCost, setIssues } from '@/lib/cost/set-detail';
import { CostDetailCardBase } from '@/components/cost/shared/CostDetailCardBase';

export function SetDetailCard({ menu, recipe, onEdit }) {
  return (
    <CostDetailCardBase
      menu={menu}
      recipe={recipe}
      onEdit={onEdit}
      totalCost={setTotalCost(recipe)}
      issues={recipe ? setIssues(recipe) : []}
    />
  );
}
