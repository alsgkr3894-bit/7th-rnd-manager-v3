import { asDisplayText, asFiniteNumber, asObjectArray } from '@/lib/ui/prop-guards';

export function collectStrictPostingIssues(recipeRows = []) {
  const issues = [];

  for (const row of asObjectArray(recipeRows)) {
    const components = asObjectArray(row.components);
    for (const component of components) {
      const quantity = asFiniteNumber(component.quantity, null);
      if (quantity == null || quantity <= 0) continue;

      const unitPrice = asFiniteNumber(component.unitPrice, null);
      if (unitPrice != null) continue;

      issues.push({
        menuCode: asDisplayText(row.menuCode, '—'),
        menuName: asDisplayText(row.menuName, '메뉴명 없음'),
        size: asDisplayText(row.size, '단일'),
        categoryLabel: asDisplayText(row.categoryLabel, '기타'),
        productCode: asDisplayText(component.productCode, '—'),
        ingredientName: asDisplayText(component.ingredientName, '식자재명 없음'),
        quantity,
        unit: asDisplayText(component.unit, 'g'),
        reason: '단가 없음',
      });
    }
  }

  return issues;
}

export function buildStrictPostingMessage(issues = [], maxItems = 3) {
  const safeIssues = asObjectArray(issues);
  if (safeIssues.length === 0) return '';

  const examples = safeIssues
    .slice(0, Math.max(1, maxItems))
    .map(issue => {
      const menuName = asDisplayText(issue.menuName, '메뉴명 없음');
      const ingredientName = asDisplayText(issue.ingredientName, '식자재명 없음');
      return `${menuName}/${ingredientName}`;
    })
    .join(', ');
  const suffix = safeIssues.length > maxItems ? ` 외 ${safeIssues.length - maxItems}건` : '';
  return `미연동 재료 ${safeIssues.length}건이 있어 보고서 생성을 막았습니다: ${examples}${suffix}`;
}
