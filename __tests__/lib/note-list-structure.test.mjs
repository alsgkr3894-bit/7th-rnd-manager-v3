import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('note list structure', () => {
  test('노트 목록 page는 통계와 필터 렌더링을 전용 컴포넌트에 위임한다', () => {
    const source = readFileSync(resolve('app/note/_NoteContent.jsx'), 'utf8');
    const filterSource = readFileSync(resolve('app/note/_NoteFilterControls.jsx'), 'utf8');
    const statsSource = readFileSync(resolve('app/note/_NoteStatsSummary.jsx'), 'utf8');

    expect(source).toContain("import { NoteStatsSummary } from './_NoteStatsSummary'");
    expect(source).toContain("import { NoteFilterControls } from './_NoteFilterControls'");
    expect(source).toContain('<NoteStatsSummary');
    expect(source).toContain('<NoteFilterControls');
    expect(source).not.toContain('const SORT_OPTIONS = [');
    expect(source).not.toContain("className={'chip' + (statusFilter === st ? ' active' : '')}");
    expect(filterSource).toContain('const SORT_OPTIONS = [');
    expect(filterSource).toContain('제목, 메뉴명, 테스트 내용, 태그 검색');
    expect(statsSource).toContain('최근 6개월');
  });
});
