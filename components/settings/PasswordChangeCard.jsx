'use client';
import { useState } from 'react';
import { verifyPassword, savePassword } from '@/lib/auth';
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
    if (next.length < 4) {
      setErr('새 비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    if (next !== conf) {
      setErr('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setBusy(true);
    try {
      const valid = await verifyPassword(cur);
      if (!valid) {
        setErr('현재 비밀번호가 올바르지 않습니다.');
        return;
      }
      await savePassword(next);
      setCur('');
      setNext('');
      setConf('');
      setOk(true);
      showToast('비밀번호가 변경됐습니다.', 'ok');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>비밀번호 변경</h2>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
        변경 후 다음 로그인부터 새 비밀번호를 사용합니다.
      </p>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320 }}
      >
        {[
          { label: '현재 비밀번호', val: cur, set: setCur, auto: 'current-password' },
          { label: '새 비밀번호', val: next, set: setNext, auto: 'new-password' },
          { label: '새 비밀번호 확인', val: conf, set: setConf, auto: 'new-password' },
        ].map(({ label, val, set, auto }) => (
          <div key={label}>
            <label
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
