import { jest } from '@jest/globals';
import {
  buildNoteCardGridProps,
  buildNoteContextMenuProps,
  buildNoteDetailModalProps,
  buildNoteTableViewProps,
} from '@/app/note/noteListBodyProps';

const fn = () => jest.fn();

describe('note list body props', () => {
  test('컨텍스트 메뉴 props는 원래 action과 이벤트 중단 adapter를 연결한다', () => {
    const onCopy = fn();
    const onStatusChange = fn();
    const props = buildNoteContextMenuProps({
      ctxMenu: { note: { id: 'n-1' } },
      pinnedIds: new Set(['n-1']),
      closeContextMenu: fn(),
      onEditNote: fn(),
      onTogglePin: fn(),
      onCopy,
      onStatusChange,
      onDelete: fn(),
    });

    props.onCopy({ id: 'n-1' });
    props.onStatusChange('n-1', 'done');

    expect(onCopy).toHaveBeenCalledWith({ id: 'n-1' }, expect.any(Object));
    expect(onCopy.mock.calls[0][1].stopPropagation).toEqual(expect.any(Function));
    expect(onStatusChange).toHaveBeenCalledWith('n-1', 'done', expect.any(Object));
    expect(onStatusChange.mock.calls[0][2].stopPropagation).toEqual(expect.any(Function));
  });

  test('카드 그리드 props는 편집 클릭 전파를 막고 원래 note를 넘긴다', () => {
    const onEditNote = fn();
    const stopPropagation = fn();
    const props = buildNoteCardGridProps({
      visible: [{ id: 'n-1' }],
      filtered: [{ id: 'n-1' }, { id: 'n-2' }],
      batchMode: false,
      selected: new Set(),
      pinnedIds: new Set(),
      popIds: new Set(),
      hlRe: null,
      openContextMenu: fn(),
      onOpenDetail: fn(),
      onEditNote,
      onToggleSelect: fn(),
      onTogglePin: fn(),
      onCopy: fn(),
      onDelete: fn(),
      onStatusChange: fn(),
      onNewVersion: fn(),
      onTagClick: fn(),
      onLoadMore: fn(),
    });

    props.onEdit({ id: 'n-2' }, { stopPropagation });

    expect(props.filteredCount).toBe(2);
    expect(stopPropagation).toHaveBeenCalled();
    expect(onEditNote).toHaveBeenCalledWith({ id: 'n-2' });
  });

  test('테이블과 상세 모달 props는 표시 상태와 상세 편집 callback을 조립한다', () => {
    const detailNote = { id: 'detail-1' };
    const onEditNote = fn();
    const tableProps = buildNoteTableViewProps({
      visible: [{ id: 'n-1' }],
      filtered: [{ id: 'n-1' }],
      focusedRow: 'n-1',
      setFocusedRow: fn(),
      onOpenDetail: fn(),
      onEditNote,
      onDelete: fn(),
      onStatusChange: fn(),
      onLoadMore: fn(),
    });
    const modalProps = buildNoteDetailModalProps({
      detailNote,
      onCloseDetail: fn(),
      onEditNote,
    });

    modalProps.onEdit();

    expect(tableProps.focusedRow).toBe('n-1');
    expect(tableProps.onEdit).toBe(onEditNote);
    expect(modalProps.note).toBe(detailNote);
    expect(onEditNote).toHaveBeenCalledWith(detailNote);
  });
});
