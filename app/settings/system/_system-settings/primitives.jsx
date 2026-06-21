'use client';

export function SettingsGroup({ title, children, style }) {
  return (
    <div className="card" style={{ marginTop: style?.marginTop ?? 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{title}</h2>
      <div>{children}</div>
    </div>
  );
}

export function SettingsRow({ name, desc, control, last }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 0',
        borderBottom: last ? 'none' : '1px solid var(--border)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ flex: '0 0 auto' }}>{control}</div>
    </div>
  );
}

export function Segmented({ value, options, onChange }) {
  const safeOptions = Array.isArray(options) ? options : [];
  const handleChange = typeof onChange === 'function' ? onChange : () => {};

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {safeOptions.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 8,
              background: active ? 'var(--accent-soft)' : 'var(--surface)',
              color: active ? 'var(--accent-text)' : 'var(--text-2)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function StaticValue({ children }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-2)',
        padding: '6px 12px',
        borderRadius: 8,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
      }}
    >
      {children}
    </div>
  );
}

export function StatusValue({ children, tone = 'default' }) {
  const style =
    tone === 'ok'
      ? {
          background: 'var(--success-soft, rgba(34,197,94,.12))',
          color: 'var(--positive)',
          borderColor: 'color-mix(in srgb, var(--positive) 35%, var(--border))',
        }
      : tone === 'pending'
        ? {
            background: 'var(--warning-soft, rgba(245,158,11,.14))',
            color: 'var(--warning-text, #b45309)',
            borderColor: 'color-mix(in srgb, #f59e0b 35%, var(--border))',
          }
        : {};

  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--text-2)',
        padding: '6px 12px',
        borderRadius: 8,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DangerConfirm({
  label,
  confirmMsg,
  confirmLabel,
  isOpen,
  onOpen,
  onClose,
  onConfirm,
  disabled,
  busy,
}) {
  if (!isOpen) {
    return (
      <button
        className="btn"
        onClick={onOpen}
        disabled={disabled}
        style={{ color: 'var(--negative)', borderColor: 'var(--negative)' }}
      >
        {label}
      </button>
    );
  }
  return (
    <div role="alert" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ color: 'var(--negative)', fontWeight: 600, fontSize: 13 }}>{confirmMsg}</span>
      <button className="btn" disabled={busy} onClick={onClose}>
        취소
      </button>
      <button
        className="btn primary"
        disabled={busy}
        onClick={onConfirm}
        style={{ background: 'var(--negative)' }}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

export function InfoCell({ label, value, big = false, mono = false }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div
        className={mono ? 'num' : ''}
        style={{
          fontSize: big ? 22 : 14,
          fontWeight: big ? 700 : 600,
          fontFamily: mono ? 'monospace' : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}

const STORAGE_WARN_PCT = 70;
const STORAGE_DANGER_PCT = 90;

export function StorageUsageBar({ usage, quota }) {
  const usageMB = (usage / 1024 / 1024).toFixed(1);
  const quotaMB = (quota / 1024 / 1024).toFixed(0);
  const pct = quota > 0 ? Math.min(100, (usage / quota) * 100) : 0;
  const isWarn = pct >= STORAGE_WARN_PCT;
  const isDanger = pct >= STORAGE_DANGER_PCT;
  const barColor = isDanger ? 'var(--negative)' : isWarn ? 'var(--warn)' : 'var(--accent)';

  return (
    <div
      style={{
        marginBottom: 16,
        padding: '12px 16px',
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'var(--surface-2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
          브라우저 저장 공간
        </span>
        <span className="num" style={{ fontSize: 13, color: isWarn ? barColor : 'var(--text-3)' }}>
          {usageMB} MB / {quotaMB} MB ({pct.toFixed(1)}%)
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 3,
            width: `${pct}%`,
            background: barColor,
            transition: 'width 400ms ease',
          }}
        />
      </div>
      {isWarn && (
        <div style={{ marginTop: 8, fontSize: 12, color: barColor, fontWeight: 600 }}>
          {isDanger
            ? '⚠ 저장 공간이 거의 꽉 찼습니다. 데이터를 백업하고 일부를 삭제하세요.'
            : '⚠ 저장 공간이 70%를 넘었습니다. 정기적인 백업을 권장합니다.'}
        </div>
      )}
    </div>
  );
}
