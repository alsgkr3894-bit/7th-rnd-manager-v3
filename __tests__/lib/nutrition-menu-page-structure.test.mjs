import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/nutrition/menu/page.jsx'), 'utf8');
const noticesSource = readFileSync(resolve('app/nutrition/menu/NutritionMenuNotices.jsx'), 'utf8');
const skeletonSource = readFileSync(
  resolve('app/nutrition/menu/NutritionMenuSkeleton.jsx'),
  'utf8'
);
const workspaceSource = readFileSync(
  resolve('app/nutrition/menu/NutritionMenuWorkspace.jsx'),
  'utf8'
);

describe('nutrition menu page structure', () => {
  test('page delegates notices, loading skeleton, and tab workspace rendering', () => {
    expect(pageSource).toContain('<DuplicateNotice');
    expect(pageSource).toContain('<MissingMasterNotice');
    expect(pageSource).toContain('<NutritionMenuSkeleton');
    expect(pageSource).toContain('<NutritionMenuWorkspace');
    expect(pageSource).toContain('repairNutritionBaseDuplicates');
    expect(pageSource).toContain('deleteMenuRefsByMenuCodes');
    expect(pageSource).not.toContain("import dynamic from 'next/dynamic'");
    expect(pageSource).not.toContain('<Skeleton');
    expect(pageSource).not.toContain('<SearchBox');
    expect(pageSource).not.toContain('<TabBase');

    expect(noticesSource).toContain('export function DuplicateNotice');
    expect(noticesSource).toContain('export function MissingMasterNotice');
    expect(noticesSource).toContain('영양성분 중복 데이터');
    expect(skeletonSource).toContain('export function NutritionMenuSkeleton');
    expect(skeletonSource).toContain('<Skeleton');
    expect(workspaceSource).toContain('export function NutritionMenuWorkspace');
    expect(workspaceSource).toContain("import dynamic from 'next/dynamic'");
    expect(workspaceSource).toContain('<SearchBox');
    expect(workspaceSource).toContain('<TabBase');
    expect(workspaceSource).toContain('<TabSetCalc');
  });
});
