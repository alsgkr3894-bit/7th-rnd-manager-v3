'use client';
/* eslint-disable react/no-unescaped-entities */

/**
 * app/note/write/_NoteWriteBanners.jsx — 이전 노트 기반 안내 배너 / 임시저장 복구 배너
 */
export function NoteWriteBanners({
  fromTitle,
  canEdit,
  showDraftBanner,
  onRestoreDraft,
  onDismissDraftBanner,
}) {
  return (
    <>
      {fromTitle && (
        <div
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent-text)',
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 13,
            marginTop: 8,
          }}
        >
          이전 노트 "<b>{fromTitle}</b>"을 기반으로 새 버전을 작성하고 있습니다.
        </div>
      )}
      {canEdit && showDraftBanner && !fromTitle && (
        <div
          style={{
            background: 'var(--warn-soft)',
            color: 'var(--warn)',
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 13,
            marginTop: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>이전에 작성하던 임시저장이 있어요.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm" onClick={onRestoreDraft}>
              불러오기
            </button>
            <button className="btn sm" onClick={onDismissDraftBanner}>
              무시
            </button>
          </div>
        </div>
      )}
    </>
  );
}
