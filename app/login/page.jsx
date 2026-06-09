'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getProfile } from '@/lib/profile';
import { isAuthSetup, verifyPassword, savePassword, setAuthCookie } from '@/lib/auth';

// useSearchParams()는 Suspense 경계 안에서만 사용 가능 (Next.js 14 빌드 요구사항)
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSetup = searchParams.get('setup') === '1';

  const [profile, setProfileState] = useState({ name: '', team: '' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'setup'
  const pwRef = useRef(null);

  useEffect(() => {
    const p = getProfile();
    setProfileState(p);
    // 초기 설정이 안 됐거나 URL에 setup=1이면 설정 모드
    if (isSetup || !isAuthSetup()) setMode('setup');
    else setMode('login');
    pwRef.current?.focus();
  }, [isSetup]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'setup') {
        if (!password) {
          setError('비밀번호를 입력하세요.');
          return;
        }
        if (password.length < 4) {
          setError('비밀번호는 4자 이상이어야 합니다.');
          return;
        }
        if (password !== confirm) {
          setError('비밀번호가 일치하지 않습니다.');
          return;
        }
        await savePassword(password);
        setAuthCookie(remember);
        router.replace('/');
      } else {
        const ok = await verifyPassword(password);
        if (!ok) {
          setError('비밀번호가 올바르지 않습니다.');
          return;
        }
        setAuthCookie(remember);
        router.replace('/');
      }
    } catch (err) {
      setError(err?.message || '오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }

  const title = mode === 'setup' ? '비밀번호 설정' : '로그인';

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg)',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--surface)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          padding: '36px 32px',
        }}
      >
        {/* 로고 영역 */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'var(--accent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3 4 19a1 1 0 0 0 1 1.4l7 .6 7-.6a1 1 0 0 0 1-1.4Z" />
              <circle cx="10" cy="10" r="1" />
              <circle cx="14" cy="13" r="1" />
            </svg>
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-1)', lineHeight: 1.2 }}>
            7번가 R&D 플랫폼
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{title}</div>
        </div>

        {/* 프로필 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'var(--surface-2)',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {(profile.name || '?')[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>
              {profile.name || '사용자'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {profile.team || profile.role || ''}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 비밀번호 */}
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
              {mode === 'setup' ? '새 비밀번호' : '비밀번호'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                ref={pwRef}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder={mode === 'setup' ? '4자 이상 입력' : '비밀번호 입력'}
                autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
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
                onClick={() => setShowPw(v => !v)}
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
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          {/* 확인 입력 (설정 모드) */}
          {mode === 'setup' && (
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
                비밀번호 확인
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCf ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => {
                    setConfirm(e.target.value);
                    setError('');
                  }}
                  placeholder="동일하게 입력"
                  autoComplete="new-password"
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
                  onClick={() => setShowCf(v => !v)}
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
                  <EyeIcon open={showCf} />
                </button>
              </div>
            </div>
          )}

          {/* 에러 */}
          {error && (
            <div style={{ fontSize: 13, color: 'var(--negative)', fontWeight: 600 }}>{error}</div>
          )}

          {/* 30일 유지 */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>30일 동안 로그인 유지</span>
          </label>

          {/* 버튼 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '11px 0',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '확인 중…' : mode === 'setup' ? '비밀번호 저장 후 입장' : '입장'}
          </button>
        </form>

        {mode === 'setup' && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.5, marginBottom: 8 }}>
              비밀번호는 이 기기의 브라우저 저장소에만 저장됩니다.
            </p>
            {/* 비밀번호가 이미 설정된 상태에서 ?setup=1로 잘못 진입한 경우 복귀 링크 */}
            {isAuthSetup() && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setPassword('');
                  setConfirm('');
                  setError('');
                }}
                style={{
                  fontSize: 12,
                  color: 'var(--accent-text)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                기존 비밀번호로 로그인
              </button>
            )}
          </div>
        )}
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
