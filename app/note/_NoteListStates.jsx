'use client';
import { Icon } from '@/components/icons';
import { NoteCardSkeleton } from '@/components/ui/Skeleton';

const SKELETON_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: 16,
  marginTop: 24,
};

export function NoteListStates({
  loading,
  notesCount,
  filteredCount,
  search,
  canEdit = false,
  onCreate,
}) {
  if (loading) {
    return (
      <div style={SKELETON_GRID_STYLE}>
        {Array.from({ length: 6 }).map((_, i) => (
          <NoteCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (notesCount === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 16 }}>
        <div className="empty-icon-wrap empty-float">
          <Icon.note style={{ width: 32, height: 32 }} />
        </div>
        <div className="empty-title">아직 노트가 없어요</div>
        <div className="empty-sub">메뉴 테스트 결과나 아이디어를 기록해보세요.</div>
        <button
          className="btn primary"
          style={{ marginTop: 8 }}
          onClick={onCreate}
          disabled={!canEdit}
        >
          <Icon.plus style={{ width: 13, height: 13 }} /> 첫 노트 작성
        </button>
      </div>
    );
  }

  if (filteredCount === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 16 }}>
        <div className="empty-icon-wrap">
          <Icon.search style={{ width: 32, height: 32 }} />
        </div>
        <div className="empty-title">
          {search ? `"${search}" 검색 결과가 없어요` : '조건에 맞는 노트가 없어요'}
        </div>
        <div className="empty-sub">필터를 바꾸거나 다른 검색어를 입력해보세요.</div>
      </div>
    );
  }

  return null;
}
