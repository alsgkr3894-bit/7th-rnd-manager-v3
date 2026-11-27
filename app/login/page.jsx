'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile } from '@/lib/profile';
import { clearLegacyAuthStorage, establishServerSession, getServerAuthStatus } from '@/lib/auth';
import { PASSWORD_MIN_LENGTH, passwordProblem } from '@/lib/auth/password-policy';
import { PasswordField } from './PasswordField';
import { PARENT_COMPANY } from '@/lib/companies';

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

  const [profile, setProfileState] = useState({ name: '', team: '' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [setupToken, setSetupToken] = useState('');
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
    clearLegacyAuthStorage();
    let alive = true;
    getServerAuthStatus()
      .then(status => {
        if (alive) setMode(status.configured ? 'login' : 'setup');
      })
      .catch(err => {
        // 설정 파일이 손상된 경우 서버가 복구 방법을 알려 준다
        if (alive) setError(err?.message || '서버 상태를 확인하지 못했습니다.');
      });
    pwRef.current?.focus();
    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'setup') {
        const problem =
          passwordProblem(password) ||
          (password !== confirm ? '비밀번호가 일치하지 않습니다.' : '') ||
          (setupToken.trim() ? '' : '설치 토큰을 입력하세요.');
        if (problem) {
          setError(problem);
          return;
        }
      }
      // 틀린 횟수와 잠금은 서버가 세고 안내 문장도 서버가 보낸다
      await establishServerSession(password, { remember, setupToken });
      router.replace('/');
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
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-4)',
              letterSpacing: '0.02em',
            }}
          >
            {PARENT_COMPANY.name}
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
          <PasswordField
            label={mode === 'setup' ? '새 비밀번호' : '비밀번호'}
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setError('');
            }}
            show={showPw}
            onToggleShow={() => setShowPw(v => !v)}
            placeholder={mode === 'setup' ? `${PASSWORD_MIN_LENGTH}자 이상 입력` : '비밀번호 입력'}
            autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
            error={error}
            inputRef={pwRef}
          />

          {/* 확인 입력 (설정 모드) */}
          {mode === 'setup' && (
            <PasswordField
              label="비밀번호 확인"
              value={confirm}
              onChange={e => {
                setConfirm(e.target.value);
                setError('');
              }}
              show={showCf}
              onToggleShow={() => setShowCf(v => !v)}
              placeholder="동일하게 입력"
              autoComplete="new-password"
              error={error}
            />
          )}

          {/* 설치 토큰 (설정 모드) — 서버 폴더를 열 수 있는 사람만 처음 설정할 수 있다 */}
          {mode === 'setup' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                설치 토큰
              </span>
              <input
                type="text"
                className="form-input"
                value={setupToken}
                onChange={e => {
                  setSetupToken(e.target.value);
                  setError('');
                }}
                autoComplete="off"
                spellCheck={false}
              />
              <span style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.5 }}>
                사이트 폴더의 .runtime-auth.json.setup-token 파일에 적힌 값입니다.
              </span>
            </label>
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
          <p
            style={{
              marginTop: 16,
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-4)',
              lineHeight: 1.5,
            }}
          >
            비밀번호 설정은 운영 PC에서만 할 수 있고, 확인값은 서버에만 저장됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
