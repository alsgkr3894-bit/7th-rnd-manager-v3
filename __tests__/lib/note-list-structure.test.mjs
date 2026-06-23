import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('note list structure', () => {
  test('노트 목록 page는 통계와 필터 렌더링을 전용 컴포넌트에 위임한다', () => {
    const source = readFileSync(resolve('app/note/_NoteContent.jsx'), 'utf8');
    const filterSource = readFileSync(resolve('app/note/_NoteFilterControls.jsx'), 'utf8');
    const statsSource = readFileSync(resolve('app/note/_NoteStatsSummary.jsx'), 'utf8');
    const cardGridSource = readFileSync(resolve('app/note/_NoteCardGrid.jsx'), 'utf8');
    const tableViewSource = readFileSync(resolve('app/note/_NoteTableView.jsx'), 'utf8');
    const bodySource = readFileSync(resolve('app/note/_NoteListBody.jsx'), 'utf8');
    const bodyPropsSource = readFileSync(resolve('app/note/noteListBodyProps.js'), 'utf8');
    const bodyOverlayPropsSource = readFileSync(
      resolve('app/note/noteListBodyOverlayProps.js'),
      'utf8'
    );
    const bodyViewPropsSource = readFileSync(resolve('app/note/noteListBodyViewProps.js'), 'utf8');
    const contextMenuStateSource = readFileSync(
      resolve('app/note/useNoteContextMenuState.js'),
      'utf8'
    );
    const headerSource = readFileSync(resolve('app/note/_NoteListHeader.jsx'), 'utf8');
    const statesSource = readFileSync(resolve('app/note/_NoteListStates.jsx'), 'utf8');
    const dialogsSource = readFileSync(resolve('app/note/_NotePageDialogs.jsx'), 'utf8');
    const controllerSource = readFileSync(resolve('hooks/useNoteContentController.js'), 'utf8');
    const contentPropsSource = readFileSync(resolve('lib/note/content-props.js'), 'utf8');
    const contentPropBuildersSource = readFileSync(
      resolve('lib/note/content-prop-builders.js'),
      'utf8'
    );
    const contentPropDialogBuildersSource = readFileSync(
      resolve('lib/note/content-prop-dialog-builders.js'),
      'utf8'
    );
    const contentPropHeaderBuildersSource = readFileSync(
      resolve('lib/note/content-prop-header-builders.js'),
      'utf8'
    );
    const contentPropFilterBuildersSource = readFileSync(
      resolve('lib/note/content-prop-filter-builders.js'),
      'utf8'
    );
    const contentPropBodyBuildersSource = readFileSync(
      resolve('lib/note/content-prop-body-builders.js'),
      'utf8'
    );
    const itemActionsSource = readFileSync(resolve('hooks/useNoteItemActions.js'), 'utf8');
    const listDataSource = readFileSync(resolve('hooks/useNoteListData.js'), 'utf8');
    const listStateSource = readFileSync(resolve('hooks/useNoteListState.js'), 'utf8');
    const reportingCopySource = readFileSync(resolve('hooks/useNoteReportingCopy.js'), 'utf8');

    expect(source).toContain("import { NoteStatsSummary } from './_NoteStatsSummary'");
    expect(source).toContain("import { NoteFilterControls } from './_NoteFilterControls'");
    expect(source).toContain("import { NoteListBody } from './_NoteListBody'");
    expect(source).toContain("import { NoteListHeader } from './_NoteListHeader'");
    expect(source).toContain("import { NoteListStates } from './_NoteListStates'");
    expect(source).toContain("import { NotePageDialogs } from './_NotePageDialogs'");
    expect(source).toContain(
      "import { useNoteContentController } from '@/hooks/useNoteContentController'"
    );
    expect(source).toContain('<NoteStatsSummary');
    expect(source).toContain('<NoteFilterControls');
    expect(source).toContain('<NoteListBody');
    expect(source).toContain('<NoteListHeader');
    expect(source).toContain('<NoteListStates');
    expect(source).toContain('<NotePageDialogs');
    expect(source).not.toContain("import { NoteCardGrid } from './_NoteCardGrid'");
    expect(source).not.toContain("import { NoteTableView } from './_NoteTableView'");
    expect(source).not.toContain("import { NoteContextMenu } from './_NoteContextMenu'");
    expect(source).not.toContain("import { NoteDetailModal } from './_NoteDetailModal'");
    expect(source).not.toContain("import { useNoteItemActions } from '@/hooks/useNoteItemActions'");
    expect(source).not.toContain("import { useNoteListData } from '@/hooks/useNoteListData'");
    expect(source).not.toContain("import { useNoteListState } from '@/hooks/useNoteListState'");
    expect(source).not.toContain(
      "import { useNoteReportingCopy } from '@/hooks/useNoteReportingCopy'"
    );
    expect(source).not.toContain('useRouter');
    expect(source).not.toContain('usePathname');
    expect(source).not.toContain('const SORT_OPTIONS = [');
    expect(source).not.toContain("className={'chip' + (statusFilter === st ? ' active' : '')}");
    expect(source).not.toContain('className="stagger note-card-wrap"');
    expect(source).not.toContain('className="data-table stagger-rows"');
    expect(source).not.toContain('const [ctxMenu');
    expect(source).not.toContain('const [focusedRow');
    expect(source).not.toContain('window.innerWidth - 180');
    expect(source).not.toContain('<NoteContextMenu');
    expect(source).not.toContain('<NoteDetailModal');
    expect(source).not.toContain('<PageHeader');
    expect(source).not.toContain('<ConfirmDialog');
    expect(source).not.toContain('<NoteCardSkeleton');
    expect(source).not.toContain('아직 노트가 없어요');
    expect(source).not.toContain('async function restoreDeletedNotes');
    expect(source).not.toContain('await deleteNote(note.id)');
    expect(source).not.toContain('await addNote({');
    expect(source).not.toContain('await updateNote(noteId');
    expect(source).not.toContain('getAllNotes');
    expect(source).not.toContain('getNoteDetailStats');
    expect(source).not.toContain('useSearchHistory');
    expect(source).not.toContain('buildHighlightRegex');
    expect(source).not.toContain('copyText');
    expect(source).not.toContain('보고용 요약');
    expect(filterSource).toContain('const SORT_OPTIONS = [');
    expect(filterSource).toContain('제목, 메뉴명, 테스트 내용, 태그 검색');
    expect(statsSource).toContain('최근 6개월');
    expect(bodySource).toContain('export function NoteListBody');
    expect(bodySource).toContain('<NoteContextMenu');
    expect(bodySource).toContain('<NoteCardGrid');
    expect(bodySource).toContain('<NoteTableView');
    expect(bodySource).toContain('<NoteDetailModal');
    expect(bodySource).toContain('useNoteContextMenuState()');
    expect(bodySource).toContain('const [focusedRow');
    expect(bodySource).toContain("from './noteListBodyProps'");
    expect(bodySource).toContain('const bodyProps = {');
    expect(bodySource).toContain('buildNoteContextMenuProps(bodyProps)');
    expect(bodySource).toContain('buildNoteCardGridProps(bodyProps)');
    expect(bodySource).toContain('buildNoteTableViewProps(bodyProps)');
    expect(bodySource).toContain('buildNoteDetailModalProps(bodyProps)');
    expect(bodySource).not.toContain('const [ctxMenu');
    expect(bodySource).not.toContain('window.innerWidth - 180');
    expect(bodySource).not.toContain("e.key === 'Escape'");
    expect(bodySource).not.toContain('stopPropagation: () => {}');
    expect(bodyPropsSource).toContain("from './noteListBodyOverlayProps'");
    expect(bodyPropsSource).toContain("from './noteListBodyViewProps'");
    expect(bodyOverlayPropsSource).toContain('export function buildNoteContextMenuProps');
    expect(bodyOverlayPropsSource).toContain('export function buildNoteDetailModalProps');
    expect(bodyOverlayPropsSource).toContain('stopPropagation: () => {}');
    expect(bodyViewPropsSource).toContain('export function buildNoteCardGridProps');
    expect(bodyViewPropsSource).toContain('export function buildNoteTableViewProps');
    expect(contextMenuStateSource).toContain('export function useNoteContextMenuState');
    expect(contextMenuStateSource).toContain('const [ctxMenu');
    expect(contextMenuStateSource).toContain('window.innerWidth - 180');
    expect(contextMenuStateSource).toContain("e.key === 'Escape'");
    expect(contextMenuStateSource).toContain('closeContextMenu');
    expect(cardGridSource).toContain('export function NoteCardGrid');
    expect(cardGridSource).toContain('className="stagger note-card-wrap"');
    expect(tableViewSource).toContain('export function NoteTableView');
    expect(tableViewSource).toContain('className="data-table stagger-rows"');
    expect(headerSource).toContain('export function NoteListHeader');
    expect(headerSource).toContain('<PageHeader');
    expect(headerSource).toContain('<NoteBatchToolbar');
    expect(headerSource).toContain('보고예정 일괄복사');
    expect(headerSource).toContain('체크리스트 목록');
    expect(statesSource).toContain('export function NoteListStates');
    expect(statesSource).toContain('<NoteCardSkeleton');
    expect(statesSource).toContain('아직 노트가 없어요');
    expect(statesSource).toContain('조건에 맞는 노트가 없어요');
    expect(dialogsSource).toContain('export function NotePageDialogs');
    expect(dialogsSource).toContain('<ConfirmDialog');
    expect(dialogsSource).toContain('프리셋을 삭제할까요?');
    expect(controllerSource).toContain('export function useNoteContentController');
    expect(controllerSource).toContain('useRouter()');
    expect(controllerSource).toContain('usePathname()');
    expect(controllerSource).toContain('useNoteListData()');
    expect(controllerSource).toContain('useNoteListState({ notes, pinnedIds, pathname })');
    expect(controllerSource).toContain('useNoteReportingCopy(notes)');
    expect(controllerSource).toContain('useNoteBatchActions({ setNotes, load, canEdit })');
    expect(controllerSource).toContain('const itemActions = useNoteItemActions({');
    expect(controllerSource).toContain('canEdit,');
    expect(controllerSource).toContain(
      "import { buildNoteContentProps } from '@/lib/note/content-props'"
    );
    expect(controllerSource).toContain('return buildNoteContentProps({');
    expect(contentPropsSource).toContain('export function buildNoteContentProps');
    expect(contentPropsSource).toContain("from '@/lib/note/content-prop-builders'");
    expect(contentPropsSource).toContain(
      'buildNoteDialogProps({ canEdit, listState, batchActions, itemActions })'
    );
    expect(contentPropsSource).toContain('buildNoteHeaderProps({');
    expect(contentPropsSource).toContain('buildNoteFilterProps({ listState })');
    expect(contentPropsSource).toContain('buildNoteBodyProps({');
    expect(contentPropsSource).not.toContain('NOTE_STATUS.REPORTING');
    expect(contentPropsSource).not.toContain("router.push('/note/calendar')");
    expect(contentPropBuildersSource).toContain("from '@/lib/note/content-prop-dialog-builders'");
    expect(contentPropBuildersSource).toContain("from '@/lib/note/content-prop-header-builders'");
    expect(contentPropBuildersSource).toContain("from '@/lib/note/content-prop-filter-builders'");
    expect(contentPropBuildersSource).toContain("from '@/lib/note/content-prop-body-builders'");
    expect(contentPropBuildersSource).not.toContain('NOTE_STATUS.REPORTING');
    expect(contentPropBuildersSource).not.toContain("router.push('/note/calendar')");
    expect(contentPropDialogBuildersSource).toContain('export function buildNoteDialogProps');
    expect(contentPropDialogBuildersSource).toContain('export function buildNotePresetProps');
    expect(contentPropHeaderBuildersSource).toContain('export function buildNoteHeaderProps');
    expect(contentPropHeaderBuildersSource).toContain('export function buildNoteStatsProps');
    expect(contentPropHeaderBuildersSource).toContain('export function buildNoteStatesProps');
    expect(contentPropHeaderBuildersSource).toContain('NOTE_STATUS.REPORTING');
    expect(contentPropHeaderBuildersSource).toContain("router.push('/note/calendar')");
    expect(contentPropHeaderBuildersSource).toContain('onChecklist: listState.openChecklistList');
    expect(contentPropHeaderBuildersSource).toContain("router.push('/note/write')");
    expect(contentPropFilterBuildersSource).toContain('export function buildNoteFilterProps');
    expect(contentPropFilterBuildersSource).toContain('saveSearchHistory(search)');
    expect(contentPropBodyBuildersSource).toContain('export function buildNoteBodyProps');
    expect(contentPropBodyBuildersSource).toContain('router.push(`/note/${note.id}`)');
    expect(itemActionsSource).toContain('export function useNoteItemActions');
    expect(itemActionsSource).toContain('async function restoreDeletedNotes');
    expect(itemActionsSource).toContain('await deleteNote(note.id)');
    expect(itemActionsSource).toContain('await addNote({');
    expect(itemActionsSource).toContain('await updateNote(noteId');
    expect(itemActionsSource).toContain('setNoteFrom(note.id)');
    expect(listDataSource).toContain('export function useNoteListData');
    expect(listDataSource).toContain('getAllNotes');
    expect(listDataSource).toContain('getNoteDetailStats');
    expect(listDataSource).toContain('useVisibilityRefresh(load)');
    expect(listDataSource).toContain("showToast('노트 목록을 불러오지 못했어요', 'error')");
    expect(listStateSource).toContain('export function useNoteListState');
    expect(listStateSource).toContain('useNoteFilter(notes, pinnedIds, { pathname })');
    expect(listStateSource).toContain('useNotePresets');
    expect(listStateSource).toContain('useSearchHistory(KEYS.NOTE_SEARCH_HISTORY)');
    expect(listStateSource).toContain('buildHighlightRegex(search.trim())');
    expect(listStateSource).toContain('setLS(KEYS.NOTE_VIEW, mode)');
    expect(listStateSource).toContain('function openChecklistList()');
    expect(listStateSource).toContain("handleSearchChange('체크리스트')");
    expect(reportingCopySource).toContain('export function useNoteReportingCopy');
    expect(reportingCopySource).toContain('NOTE_STATUS.REPORTING');
    expect(reportingCopySource).toContain('copyText(text)');
    expect(reportingCopySource).toContain('보고용 요약');
  });
});
