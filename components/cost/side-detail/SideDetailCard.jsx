'use client';
import { sideTotalCost, sideIssues } from '@/lib/cost/side-detail';
import { CostDetailCardBase } from '@/components/cost/shared/CostDetailCardBase';

export function SideDetailCard({ menu, recipe, onEdit }) {
  return (
    <CostDetailCardBase
      menu={menu}
      recipe={recipe}
      onEdit={onEdit}
      totalCost={sideTotalCost(recipe)}
      issues={recipe ? sideIssues(recipe) : []}
    />
  );
}
