'use client';

// 루트 레이아웃에서 발생한 오류를 잡는 최상위 에러 바운더리.
// layout.jsx와 동일 레벨이라 자체 <html><body>가 필요.
export default function GlobalError({ error, reset }) {
  return (
    <html lang="ko">
      <body style={{
        margin: 0, padding: 0,
        background: '#0f172a',
        color: '#e2e8f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <div style={{ textAlign: 'center', padding: '40px 24px', maxWidth: 480 }}>
          <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-4px',
            background: 'linear-gradient(135deg,#38bdf8,#818cf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 16 }}>
            오류
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
            앱을 불러오는 데 실패했어요
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.6 }}>
            치명적인 오류가 발생했어요.<br/>
            페이지를 새로 고침하거나 다시 시도해 주세요.
          </p>
          {error?.message && (
            <p style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace',
              background: 'rgba(255,255,255,.05)', borderRadius: 6,
              padding: '6px 12px', marginBottom: 24, wordBreak: 'break-all' }}>
              {error.message}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={reset}
              style={{ padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: '#38bdf8', color: '#0f172a', border: 'none', cursor: 'pointer' }}>
              다시 시도
            </button>
            <a href="/"
              style={{ padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: 'rgba(255,255,255,.08)', color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,.12)', textDecoration: 'none', cursor: 'pointer' }}>
              홈으로
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
