'use client';
import { personalTotalCost, personalIssues } from '@/lib/cost/personal-detail';
import { CostDetailCardBase } from '@/components/cost/shared/CostDetailCardBase';

export function PersonalDetailCard({ menu, recipe, onEdit }) {
  return (
    <CostDetailCardBase
      menu={menu}
      recipe={recipe}
      onEdit={onEdit}
      totalCost={personalTotalCost(recipe)}
      issues={recipe ? personalIssues(recipe) : []}
    />
  );
}
