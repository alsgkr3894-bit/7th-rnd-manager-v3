'use client';

/** 저장한 백업 파일을 선택해 읽기 확인을 하는 버튼 */
export function BackupFileCheckButton({ checking, onCheckFile }) {
  return (
    <label
      className="btn sm primary file-pick-btn"
      style={{ position: 'relative', cursor: checking ? 'wait' : 'pointer' }}
    >
      {checking ? '확인 중…' : '저장한 파일 확인'}
      <input
        type="file"
        accept=".json,application/json"
        onChange={onCheckFile}
        disabled={checking}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      />
    </label>
  );
}
