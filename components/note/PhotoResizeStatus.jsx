/** 사진 변환 진행 장수와 취소 버튼. 변환 중이 아니면 아무것도 그리지 않는다. */
export function PhotoResizeStatus({ progress, onCancel }) {
  if (!progress) return null;
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 12,
        fontSize: 12,
        color: 'var(--text-3)',
      }}
    >
      <span>
        사진 처리 중 {progress.done} / {progress.total}
      </span>
      <button type="button" className="btn sm" onClick={onCancel}>
        취소
      </button>
    </div>
  );
}
