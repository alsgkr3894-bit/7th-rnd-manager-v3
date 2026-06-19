import { dbDeleteById, dbInsertOne, goto, MAIN_DB, step } from '../helpers.mjs';

/**
 * 공통원가 그룹 등록 → 공통원가 탭 목록 반영
 * P0-3: 공통원가 체크 → 메뉴 원가 → 공통원가 관리 탭 반영
 */
export async function scenarioCommonCost({ page, base, runId }) {
  const steps = [];
  const groupName = `E2E공통원가-${runId}`;
  let groupId;

  await step(steps, '공통원가 관리 페이지 진입 및 그룹 삽입', async () => {
    await goto(page, base, '/cost/recipe');

    groupId = await dbInsertOne(page, MAIN_DB, 'cost_recipe_groups', {
      name: groupName,
      description: 'E2E 테스트용 공통원가 그룹',
      sizes: ['단일'],
      defaultCategories: ['사이드'],
      ingredients: [],
      updatedAt: new Date().toISOString(),
    });
  });

  await step(steps, '공통원가 탭 재진입 후 그룹명 표시 확인', async () => {
    await goto(page, base, '/cost/recipe');
    await page
      .getByText(groupName, { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
  });

  await step(steps, '테스트 레코드 정리', async () => {
    if (groupId != null) await dbDeleteById(page, MAIN_DB, 'cost_recipe_groups', groupId);
  });

  return { name: '공통원가 그룹 등록 → 공통원가 탭 반영', steps };
}
