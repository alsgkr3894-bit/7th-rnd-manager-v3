import { readFileSync } from 'fs';
import { resolve } from 'path';

const commonSource = readFileSync(resolve('components/cost/manage/CommonManageView.jsx'), 'utf8');
const groupsSource = readFileSync(resolve('components/cost/manage/CommonGroupsView.jsx'), 'utf8');
const edgesSource = readFileSync(resolve('components/cost/manage/CommonEdgesView.jsx'), 'utf8');

describe('common cost manage view structure', () => {
  test('CommonManageView delegates group and edge tab UI to focused components', () => {
    expect(commonSource).toContain('CommonGroupsView');
    expect(commonSource).toContain('CommonEdgesView');
    expect(commonSource).toContain("from '@/hooks/useCurrentRole'");
    expect(commonSource).toContain('canEdit={canEdit}');
    expect(commonSource).toContain('ensureCanEdit');
    expect(commonSource).not.toContain('EdgeCard');
    expect(commonSource).not.toContain('GroupEditor');
    expect(groupsSource).toContain('GroupEditor');
    expect(groupsSource).toContain('disabled={!canEdit}');
    expect(groupsSource).toContain('readOnly={!canEdit}');
    expect(groupsSource).toContain('묶음 이름 검색');
    expect(edgesSource).toContain('EdgeCard');
    expect(edgesSource).toContain('canEdit={canEdit}');
    expect(edgesSource).toContain('disabled={!canEdit}');
    expect(edgesSource).toContain('엣지·도우 이름 검색');
  });
});
