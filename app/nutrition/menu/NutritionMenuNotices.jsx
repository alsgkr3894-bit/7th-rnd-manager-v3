import { asDisplayText, asObjectArray } from '@/lib/ui/prop-guards';

export function DuplicateNotice({ diagnostics, repairing, onRepair }) {
  const duplicateRows = Number(diagnostics?.duplicateRows) || 0;
  if (!duplicateRows) return null;
  const menuSamples = asObjectArray(diagnostics?.menuGroups)
    .slice(0, 2)
    .map(group => asDisplayText(group.label || group.key))
    .filter(Boolean);
  const rawSamples = asObjectArray(diagnostics?.rawGroups)
    .slice(0, 2)
    .map(group => asDisplayText(group.label || group.key))
    .filter(Boolean);
  const samples = [...menuSamples, ...rawSamples].slice(0, 3);

  return (
    <div
      style={{
        marginTop: 14,
        padding: '12px 14px',
        border: '1px solid var(--warn)',
        borderRadius: 8,
        background: 'var(--warn-soft)',
        color: 'var(--text-1)',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 260, flex: '1 1 420px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--warn)' }}>
          영양성분 중복 데이터 {duplicateRows}건 감지
        </div>
        <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
          메뉴코드 또는 메뉴+크러스트 기준으로 중복된 행이 있습니다. 최신 수정값을 남기고 나머지를
          정리할 수 있습니다.
          {samples.length > 0 && (
            <span style={{ display: 'block', color: 'var(--text-3)' }}>
              예: {samples.join(', ')}
            </span>
          )}
        </div>
      </div>
      <button className="btn sm" type="button" onClick={onRepair} disabled={repairing}>
        {repairing ? '정리 중…' : '중복 정리'}
      </button>
    </div>
  );
}

export function MissingValueNotice({ diagnostics }) {
  const missingCount = Number(diagnostics?.missingCount) || 0;
  if (!missingCount) return null;
  const samples = asObjectArray(diagnostics?.missingMenus)
    .slice(0, 3)
    .map(row => `${asDisplayText(row.menuName, '메뉴')} (${asDisplayText(row.menuCode)})`);

  return (
    <div
      style={{
        marginTop: 14,
        padding: '12px 14px',
        border: '1px solid var(--accent)',
        borderRadius: 8,
        background: 'var(--accent-soft)',
        color: 'var(--text-1)',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 260, flex: '1 1 420px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>
          영양성분 미입력 메뉴 {missingCount}건
        </div>
        <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
          아래 메뉴는 어떤 크러스트에도 영양값이 입력되지 않았습니다. 베이스/엣지 탭에서 값을
          입력해야 표 출력 시 정상 표시됩니다.
          {samples.length > 0 && (
            <span style={{ display: 'block', color: 'var(--text-3)' }}>
              예: {samples.join(', ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MissingMasterNotice({ diagnostics, repairing, onRepair, isAdmin }) {
  const orphanCount = Number(diagnostics?.orphanCount) || 0;
  if (!orphanCount) return null;
  const samples = asObjectArray(diagnostics?.orphanMenuRefs)
    .slice(0, 3)
    .map(row => `${asDisplayText(row.menuName, '메뉴')} (${asDisplayText(row.menuCode)})`);

  return (
    <div
      style={{
        marginTop: 14,
        padding: '12px 14px',
        border: '1px solid var(--negative)',
        borderRadius: 8,
        background: 'var(--negative-soft)',
        color: 'var(--text-1)',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
      role="alert"
    >
      <div style={{ minWidth: 260, flex: '1 1 420px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--negative)' }}>
          메뉴마스터에 없는 영양 메뉴 {orphanCount}건 감지
        </div>
        <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
          메뉴마스터에 다시 추가하거나 영양 메뉴에서 삭제한 뒤 출력하세요.
          {samples.length > 0 && (
            <span style={{ display: 'block', color: 'var(--text-3)' }}>
              예: {samples.join(', ')}
            </span>
          )}
        </div>
      </div>
      <button
        className="btn sm"
        type="button"
        onClick={onRepair}
        disabled={repairing || !isAdmin}
        style={{ color: 'var(--negative)', borderColor: 'var(--negative)' }}
      >
        {repairing ? '정리 중…' : '누락 메뉴 정리'}
      </button>
      {!isAdmin && (
        <div style={{ width: '100%', fontSize: 11, color: 'var(--text-3)' }}>
          정리는 관리자만 실행할 수 있습니다.
        </div>
      )}
    </div>
  );
}
