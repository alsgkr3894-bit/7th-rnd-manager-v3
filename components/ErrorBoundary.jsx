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
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 200, padding: 32,
          color: 'var(--text-3)', textAlign: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 28 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>오류가 발생했습니다</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 340 }}>
            {this.state.error?.message || '알 수 없는 오류'}
          </div>
          <button
            className="btn"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
