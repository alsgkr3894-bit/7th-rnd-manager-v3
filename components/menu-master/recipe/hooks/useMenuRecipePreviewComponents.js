import { useMemo } from 'react';
import { buildAppliedRecipeGroupComponents } from '@/lib/cost/recipe-groups/effective';

// 원산지/알레르기 미리보기는 직접 넣은 구성품뿐 아니라 체크된 공통원가(공통묶음)
// 식자재도 반영해야 실제 표출력(영양성분 알레르기 집계)과 값이 일치한다.
export function useMenuRecipePreviewComponents({
  components,
  menuCode,
  category,
  size,
  eligibleRecipeGroups,
  savableRecipeGroupIds,
}) {
  return useMemo(
    () =>
      components.concat(
        buildAppliedRecipeGroupComponents(
          { menuCode, category, size },
          eligibleRecipeGroups,
          savableRecipeGroupIds
        )
      ),
    [components, menuCode, category, size, eligibleRecipeGroups, savableRecipeGroupIds]
  );
}
