'use client';
import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this._onUnhandledRejection = this._onUnhandledRejection.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this._onUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this._onUnhandledRejection);
  }

  _onUnhandledRejection(event) {
    const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    console.error('[ErrorBoundary] unhandledrejection:', err);
    // 심각한 DB 오류만 UI에 표시 (일반 네트워크 오류는 무시)
    if (err?.name === 'QuotaExceededError' || err?.message?.includes('IndexedDB')) {
      this.setState({ hasError: true, error: err });
    }
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message;
      return (
        <main style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 320, padding: 40,
          textAlign: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: -2,
            background: 'linear-gradient(135deg,var(--accent,#38bdf8),#818cf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            오류
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>
            오류가 발생했어요
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380, lineHeight: 1.6 }}>
            예기치 않은 오류가 발생했어요.<br/>다시 시도하거나 페이지를 새로 고침해 주세요.
          </div>
          {msg && (
            <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'monospace',
              background: 'var(--surface-2)', borderRadius: 6, padding: '5px 12px',
              maxWidth: 400, wordBreak: 'break-all' }}>
              {msg}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn primary"
              onClick={() => this.setState({ hasError: false, error: null })}>
              다시 시도
            </button>
            <a href="/" className="btn">홈으로</a>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
