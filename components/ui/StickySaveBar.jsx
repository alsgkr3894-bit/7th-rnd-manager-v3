'use client';

/**
 * components/ui/StickySaveBar.jsx — 스크롤을 따라오는 저장/취소 바
 *
 * 작성 폼이 길어져 상단 헤더의 저장/취소 버튼이 스크롤 아래로 사라지는 문제를 막는다.
 * `position: sticky`로 뷰포트(문서 스크롤) 기준 하단에 붙는다 — `.main`은 자체 스크롤
 * 컨테이너가 아니라 문서가 그대로 스크롤되므로 sticky가 창 스크롤 기준으로 동작한다.
 * 모바일 하단 탭바(`.bottom-tab-bar`, 60px + safe-area)와 겹치지 않도록
 * `app/styles/features/note.css`의 `.form-save-bar`에서 반응형 bottom 오프셋을 둔다.
 */
export function StickySaveBar({
  onCancel,
  onSave,
  saving = false,
  canSave = true,
  cancelLabel = '취소',
  saveLabel = '저장',
  savingLabel = '저장 중…',
  status = null,
  extra = null,
}) {
  return (
    <div className="form-save-bar no-print">
      <span className="form-save-bar-status" aria-live="polite" aria-atomic="true">
        {status}
      </span>
      <div className="form-save-bar-actions">
        {extra}
        <button type="button" className="btn" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={onSave}
          disabled={saving || !canSave}
        >
          {saving ? savingLabel : saveLabel}
        </button>
      </div>
    </div>
  );
}
