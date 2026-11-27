'use client';
import { useState } from 'react';
import { changeServerPassword, clearLegacyAuthStorage } from '@/lib/auth';
import { passwordProblem } from '@/lib/auth/password-policy';
import { showToast } from '@/components/Toast';

export function PasswordChangeCard() {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [conf, setConf] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setOk(false);
    if (!cur) {
      setErr('현재 비밀번호를 입력하세요.');
      return;
    }
    const problem = passwordProblem(next);
    if (problem) {
      setErr(`새 ${problem}`);
      return;
    }
    if (next !== conf) {
      setErr('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setBusy(true);
    try {
      await changeServerPassword({ currentPassword: cur, newPassword: next });
      clearLegacyAuthStorage();
      setCur('');
      setNext('');
      setConf('');
      setOk(true);
      showToast('비밀번호가 변경됐습니다. 다른 곳의 로그인은 해제됩니다.', 'ok');
    } catch (error) {
      setErr(error?.message || '비밀번호를 변경하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>비밀번호 변경</h2>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
        변경하면 다른 브라우저와 PC의 로그인은 바로 해제됩니다. 지금 쓰는 브라우저는 유지됩니다.
      </p>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320 }}
      >
        {[
          {
            id: 'current-password',
            label: '현재 비밀번호',
            val: cur,
            set: setCur,
            auto: 'current-password',
          },
          {
            id: 'new-password',
            label: '새 비밀번호',
            val: next,
            set: setNext,
            auto: 'new-password',
          },
          {
            id: 'confirm-new-password',
            label: '새 비밀번호 확인',
            val: conf,
            set: setConf,
            auto: 'new-password',
          },
        ].map(({ id, label, val, set, auto }) => (
          <div key={label}>
            <label
              htmlFor={id}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-2)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {label}
            </label>
            <input
              id={id}
              type="password"
              value={val}
              onChange={e => {
                set(e.target.value);
                setErr('');
                setOk(false);
              }}
              autoComplete={auto}
              className="form-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        ))}
        {err && (
          <div style={{ fontSize: 13, color: 'var(--negative)', fontWeight: 600 }}>{err}</div>
        )}
        {ok && (
          <div style={{ fontSize: 13, color: 'var(--positive)', fontWeight: 600 }}>
            비밀번호가 변경됐습니다.
          </div>
        )}
        <button
          type="submit"
          className="btn primary sm"
          disabled={busy}
          style={{ alignSelf: 'flex-start', marginTop: 4 }}
        >
          {busy ? '처리 중…' : '비밀번호 변경'}
        </button>
      </form>
    </div>
  );
}
