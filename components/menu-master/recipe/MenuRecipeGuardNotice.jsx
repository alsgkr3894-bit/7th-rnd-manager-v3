'use client';

// MenuRecipeSection이 아직 편집 UI를 보여줄 수 없을 때(지원하지 않는 카테고리 /
// 코드 미입력) 쓰는 안내 박스 — 두 케이스가 같은 스타일을 공유해서 뽑아냈다.
export function MenuRecipeGuardNotice({ message }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: 'var(--text-4)',
        padding: '10px 12px',
        border: '1px dashed var(--divider)',
        borderRadius: 8,
      }}
    >
      {message}
    </div>
  );
}
