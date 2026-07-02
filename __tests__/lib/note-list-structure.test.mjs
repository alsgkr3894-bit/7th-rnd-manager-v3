import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('note list structure', () => {
  test('노트 목록 page는 필터와 목록 렌더링을 전용 컴포넌트에 위임한다', () => {
    const source = readFileSync(resolve('app/note/_NoteContent.jsx'), 'utf8');
    const filterSource = readFileSync(resolve('app/note/_NoteFilterControls.jsx'), 'utf8');
    const cardGridSource = readFileSync(resolve('app/note/_NoteCardGrid.jsx'), 'utf8');
    const cardSource = readFileSync(resolve('app/note/_NoteCard.jsx'), 'utf8');
    const ideaGroupCardSource = readFileSync(resolve('app/note/_NoteIdeaGroupCard.jsx'), 'utf8');
    const ideaGroupsSource = readFileSync(resolve('app/note/noteIdeaGroups.js'), 'utf8');
    const tableViewSource = readFileSync(resolve('app/note/_NoteTableView.jsx'), 'utf8');
    const tableRowSource = readFileSync(resolve('app/note/_NoteTableRow.jsx'), 'utf8');
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
    const detailPageSource = readFileSync(resolve('app/note/[id]/page.jsx'), 'utf8');
    const chainTimelineSource = readFileSync(
      resolve('app/note/[id]/detail/ChainTimeline.jsx'),
      'utf8'
    );
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
    const listStateHelperSource = readFileSync(resolve('lib/note/list-state.js'), 'utf8');

    expect(source).toContain("import { NoteFilterControls } from './_NoteFilterControls'");
    expect(source).toContain("import { NoteListBody } from './_NoteListBody'");
    expect(source).toContain("import { NoteListHeader } from './_NoteListHeader'");
    expect(source).toContain("import { NoteListStates } from './_NoteListStates'");
    expect(source).toContain("import { NotePageDialogs } from './_NotePageDialogs'");
    expect(source).toContain(
      "import { useNoteContentController } from '@/hooks/useNoteContentController'"
    );
    expect(source).toContain('<NoteFilterControls');
    expect(source).toContain('<NoteListBody');
    expect(source).toContain('<NoteListHeader');
    expect(source).toContain('<NoteListStates');
    expect(source).toContain('<NotePageDialogs');
    expect(source).not.toContain("import { NoteStatsSummary } from './_NoteStatsSummary'");
    expect(source).not.toContain('<NoteStatsSummary');
    expect(source).not.toContain('statsProps');
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
    expect(filterSource).toContain('제목, 테스트 내용, 태그 검색');
    expect(filterSource).toContain("label: '제목순'");
    expect(filterSource).toContain('safeCounts.all > 0');
    expect(filterSource).toContain('safeCounts[status] > 0');
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
    expect(cardGridSource).toContain("import { NoteIdeaGroupCard } from './_NoteIdeaGroupCard'");
    expect(cardGridSource).toContain("import { buildNoteIdeaGroups } from './noteIdeaGroups'");
    expect(cardGridSource).toContain(
      'const allGroups = buildNoteIdeaGroups(filtered, filtered, { sortBy, pinnedIds })'
    );
    expect(cardGridSource).toContain('const groups = allGroups.slice(0, visibleLimit)');
    expect(cardGridSource).not.toContain('메뉴개발 보드');
    expect(cardGridSource).not.toContain('표시 기록');
    expect(cardGridSource).not.toContain('전체 기록');
    expect(cardGridSource).toContain('gridTemplateColumns:');
    expect(ideaGroupCardSource).toContain('export function NoteIdeaGroupCard');
    expect(ideaGroupCardSource).toContain('function MiniStat');
    expect(ideaGroupCardSource).toContain('+ 다음 차수');
    expect(ideaGroupCardSource).toContain('label="차수"');
    expect(ideaGroupCardSource).toContain('collectLatestRoundNotePhotos(notes, 3)');
    expect(ideaGroupCardSource).toContain('STATUSES.map(status');
    expect(ideaGroupCardSource).toContain('onStatusChange');
    expect(ideaGroupCardSource).toContain('statusChange(latest.id, event.target.value, event)');
    expect(ideaGroupCardSource).toContain('onMouseDown={event => event.stopPropagation()}');
    expect(ideaGroupCardSource).toContain("import { useState } from 'react'");
    expect(ideaGroupCardSource).toContain('const [expanded, setExpanded] = useState(false)');
    expect(ideaGroupCardSource).toContain('function openRound(note, event)');
    expect(ideaGroupCardSource).toContain('aria-expanded={expanded}');
    expect(ideaGroupCardSource).toContain('{expanded && (');
    expect(ideaGroupCardSource).toContain('latestPreviewRows.map');
    expect(ideaGroupCardSource).toContain('onClick={event => openRound(note, event)}');
    expect(ideaGroupsSource).toContain('export function buildNoteIdeaGroups');
    expect(ideaGroupsSource).toContain('export function noteIdeaTitle');
    expect(ideaGroupsSource).toContain('export function collectRecentNotePhotos');
    expect(ideaGroupsSource).toContain('export function collectLatestRoundNotePhotos');
    expect(cardSource).toContain('noteDisplayTitle(note)');
    expect(cardSource).toContain('function firstPhoto');
    expect(cardSource).toContain('collectRecentNotePhotos([{ photos }], 1)');
    expect(cardSource).toContain('const snippets = [');
    expect(cardSource).toContain('gridTemplateColumns: photo ?');
    expect(cardSource).toContain('photo.caption || photo.name || title');
    expect(cardSource).not.toContain('highlightText(menuName');
    expect(tableViewSource).toContain('export function NoteTableView');
    expect(tableViewSource).toContain('className="data-table stagger-rows"');
    expect(tableViewSource).toContain('import { buildNoteIdeaGroups');
    expect(tableViewSource).toContain(
      'const [expandedGroups, setExpandedGroups] = useState(new Set())'
    );
    expect(tableViewSource).toContain('const groups = allGroups.slice(0, visibleLimit)');
    expect(tableViewSource).toContain('toggleGroup(group.key)');
    expect(tableViewSource).toContain('group.notes.map((note, index)');
    expect(tableViewSource).toContain('roundLabel={roundLabel(note, index)}');
    expect(tableViewSource).not.toContain('메뉴명');
    expect(tableRowSource).toContain('noteDisplayTitle(note)');
    expect(tableRowSource).toContain('roundLabel');
    expect(tableRowSource).not.toContain('{note.menuName}</td>');
    expect(headerSource).toContain('export function NoteListHeader');
    expect(headerSource).toContain('<PageHeader');
    expect(headerSource).toContain('function noteListSubText');
    expect(headerSource).toContain('sub={noteListSubText(notesCount)}');
    expect(headerSource).not.toContain('sub={`전체 ${notesCount}개`}');
    expect(headerSource).toContain('<NoteBatchToolbar');
    expect(headerSource).toContain('onMerge={onBatchMerge}');
    expect(headerSource).toContain('전체 보고서 PDF');
    expect(headerSource).toContain('disabled={reportExportCount === 0}');
    expect(headerSource).not.toContain('출시예정 일괄복사');
    expect(headerSource).toContain('체크리스트 목록');
    expect(detailPageSource).toContain("import { noteDisplayTitle } from '@/lib/note/display'");
    expect(detailPageSource).toContain("sub={noteDisplayTitle(form, '')}");
    expect(chainTimelineSource).toContain("import { noteDisplayTitle } from '@/lib/note/display'");
    expect(chainTimelineSource).toContain('const title = noteDisplayTitle(note)');
    expect(chainTimelineSource).not.toContain('{note.title}');
    expect(statesSource).toContain('export function NoteListStates');
    expect(statesSource).toContain('<NoteCardSkeleton');
    expect(statesSource).toContain('아직 노트가 없어요');
    expect(statesSource).toContain('조건에 맞는 노트가 없어요');
    expect(dialogsSource).toContain('export function NotePageDialogs');
    expect(dialogsSource).toContain('<ConfirmDialog');
    expect(dialogsSource).toContain('차수로 묶을까요?');
    expect(dialogsSource).toContain('confirmLabel="차수로 묶기"');
    expect(dialogsSource).toContain('프리셋을 삭제할까요?');
    expect(controllerSource).toContain('export function useNoteContentController');
    expect(controllerSource).toContain('useRouter()');
    expect(controllerSource).toContain('usePathname()');
    expect(controllerSource).toContain('useNoteListData()');
    expect(controllerSource).toContain('useNoteListState({ notes, pinnedIds, pathname })');
    expect(controllerSource).not.toContain('useNoteReportingCopy(notes)');
    expect(controllerSource).toContain('useNoteReportPdf(listState.filtered)');
    expect(controllerSource).toContain('useNoteBatchActions({ notes, setNotes, load, canEdit })');
    expect(controllerSource).toContain('const itemActions = useNoteItemActions({');
    expect(controllerSource).toContain('canEdit,');
    expect(controllerSource).toContain(
      "import { buildNoteContentProps } from '@/lib/note/content-props'"
    );
    expect(controllerSource).toContain(
      "import { useNoteReportPdf } from '@/hooks/useNoteReportPdf'"
    );
    expect(controllerSource).toContain('return buildNoteContentProps({');
    expect(contentPropsSource).toContain('export function buildNoteContentProps');
    expect(contentPropsSource).toContain("from '@/lib/note/content-prop-builders'");
    expect(contentPropsSource).toContain(
      'buildNoteDialogProps({ canEdit, listState, batchActions, itemActions })'
    );
    expect(contentPropsSource).toContain('buildNoteHeaderProps({');
    expect(contentPropsSource).toContain('handleReportPdf,');
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
    expect(contentPropHeaderBuildersSource).not.toContain('NOTE_STATUS.RELEASE_READY');
    expect(contentPropHeaderBuildersSource).toContain('reportExportCount');
    expect(contentPropHeaderBuildersSource).toContain('onExportReportPdf: handleReportPdf');
    expect(contentPropHeaderBuildersSource).toContain('onBatchMerge: handleBatchMerge');
    expect(contentPropHeaderBuildersSource).toContain("router.push('/note/calendar')");
    expect(contentPropHeaderBuildersSource).toContain('onChecklist: listState.openChecklistList');
    expect(contentPropHeaderBuildersSource).toContain("router.push('/note/write')");
    expect(contentPropFilterBuildersSource).toContain('export function buildNoteFilterProps');
    expect(contentPropFilterBuildersSource).toContain('saveSearchHistory(search)');
    expect(contentPropBodyBuildersSource).toContain('export function buildNoteBodyProps');
    expect(contentPropBodyBuildersSource).toContain('router.push(`/note/${note.id}`)');
    expect(bodyViewPropsSource).toContain('batchMode');
    expect(bodyViewPropsSource).toContain('onToggleSelect');
    expect(tableViewSource).toContain('aria-label="선택"');
    expect(tableRowSource).toContain('type="checkbox"');
    expect(tableRowSource).toContain('onToggleSelect(note.id)');
    expect(itemActionsSource).toContain('export function useNoteItemActions');
    expect(itemActionsSource).toContain('async function restoreDeletedNotes');
    expect(itemActionsSource).toContain('await deleteNote(note.id)');
    expect(itemActionsSource).toContain('await addNote({');
    expect(itemActionsSource).toContain('await updateNoteChainStatus(noteId');
    expect(itemActionsSource).toContain('setNoteFrom(note.id)');
    expect(listDataSource).toContain('export function useNoteListData');
    expect(listDataSource).toContain('getAllNotes');
    expect(listDataSource).not.toContain('getAllNotesCached');
    expect(listDataSource).toContain('getNoteDetailStats');
    expect(listDataSource).toContain('useVisibilityRefresh(load)');
    expect(listDataSource).toContain("showToast('노트 목록을 불러오지 못했어요', 'error')");
    expect(listStateSource).toContain('export function useNoteListState');
    expect(listStateSource).toContain("from '@/lib/note/list-state'");
    expect(listStateSource).toContain('shouldShowAllNoteRows(statusFilter)');
    expect(listStateSource).toContain('showAllRows ? filtered : filtered.slice(0, visibleCount)');
    expect(listStateSource).toContain('useNoteFilter(notes, pinnedIds, { pathname })');
    expect(listStateSource).toContain('useNotePresets');
    expect(listStateSource).toContain('useSearchHistory(KEYS.NOTE_SEARCH_HISTORY)');
    expect(listStateSource).toContain('buildHighlightRegex(search.trim())');
    expect(listStateSource).toContain('setLS(KEYS.NOTE_VIEW, mode)');
    expect(listStateSource).toContain('function openChecklistList()');
    expect(listStateSource).toContain("handleSearchChange('체크리스트')");
    expect(listStateHelperSource).toContain('export function normalizeNoteView');
    expect(listStateHelperSource).toContain('export function shouldShowAllNoteRows');
    expect(listStateHelperSource).toContain("return statusFilter === 'all'");
  });
});
