'use client';

export default function RouteError({ error, reset }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        gap: 16,
        padding: '32px 16px',
        textAlign: 'center',
      }}
    >
      <p style={{ color: 'var(--text-2)', fontSize: 14, margin: 0 }}>
        이 화면에서 오류가 발생했습니다.
      </p>
      {error?.message && (
        <p
          style={{
            color: 'var(--text-4)',
            fontSize: 11,
            fontFamily: 'monospace',
            background: 'rgba(0,0,0,.06)',
            borderRadius: 6,
            padding: '4px 10px',
            margin: 0,
            maxWidth: 400,
            wordBreak: 'break-all',
          }}
        >
          {error.message}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={reset}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: '1px solid var(--border-strong)',
            background: 'var(--surface)',
            color: 'var(--text-1)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
        <a
          href="/"
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: '1px solid transparent',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          홈으로
        </a>
      </div>
    </div>
  );
}
