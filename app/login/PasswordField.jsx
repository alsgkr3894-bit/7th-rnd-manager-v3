'use client';

/**
 * 로그인/설정 화면 공용 비밀번호 입력 — 표시 토글(eye) 포함. 상태는 부모가 보유(순수 표현).
 */
export function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  autoComplete,
  error,
  inputRef,
}) {
  return (
    <div>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-2)',
          display: 'block',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 40px 10px 12px',
            border: `1px solid ${error ? 'var(--negative)' : 'var(--border)'}`,
            borderRadius: 8,
            fontSize: 14,
            background: 'var(--bg)',
            color: 'var(--text-1)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={onToggleShow}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'var(--text-3)',
            display: 'flex',
            padding: 2,
          }}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M3 3l18 18" strokeWidth="2.5" />
    </svg>
  ) : (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
