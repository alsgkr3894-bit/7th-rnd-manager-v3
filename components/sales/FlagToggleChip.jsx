'use client';

/**
 * 순위표 행 옆에 붙는 작은 체크박스 칩 — "미등록"/"단종"처럼 켜고 끌 수 있는 판정 표시.
 * 화면 전용(no-print). 인쇄물에는 같은 뜻의 배지(UnregisteredBadge/IrregularMenuBadge)가 대신 나간다.
 */
export function FlagToggleChip({
  label,
  checked,
  onChange,
  title,
  disabled = false,
  tone = 'neutral',
}) {
  const isOn = !!checked;
  const onColor = tone === 'warn' ? 'var(--warn)' : 'var(--text-2)';
  const onBackground = tone === 'warn' ? 'var(--warn-soft)' : 'var(--surface-2)';
  return (
    <label
      className="chip no-print flag-toggle-chip"
      title={title}
      style={{
        marginLeft: 6,
        fontSize: 10,
        padding: '1px 6px',
        minHeight: 0,
        lineHeight: 1.5,
        borderRadius: 4,
        gap: 4,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        border: `1px ${isOn ? 'solid' : 'dashed'} var(--border)`,
        background: isOn ? onBackground : 'transparent',
        color: isOn ? onColor : 'var(--text-4)',
      }}
    >
      <input
        type="checkbox"
        checked={isOn}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        style={{ margin: 0, width: 14, height: 14, minWidth: 14, minHeight: 14 }}
      />
      {label}
    </label>
  );
}
