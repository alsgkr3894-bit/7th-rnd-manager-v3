'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { showToast } from '@/components/Toast';
import { getProfile, setProfile, getInitial } from '@/lib/profile';
import { verifyPassword, savePassword } from '@/lib/auth';
import { getLastLogin, getCachedIP, fetchClientIP } from '@/lib/session';
import { formatRelative } from '@/lib/format';
import { SettingTile } from '@/components/ui/SettingTile';
import { useSettingsAuth } from '@/hooks/useSettingsAuth';

/**
 * 계정 관리 페이지
 *
 * v3는 단일 사용자 / 로컬 환경 — 인증·멀티 사용자 시스템 없음.
 * 디자인 기준이지만 다음 항목은 제외:
 *   - 마지막 로그인 / 접속 IP (인증 없음)
 *   - 비밀번호 변경 / 2FA (로그인 없음)
 *   - 구성원 목록 / 초대 / 역할 변경 (멀티 사용자 없음)
 *
 * 포함:
 *   - 내 프로필 카드 (편집 가능, localStorage 저장)
 *   - 단일 사용자 환경 안내
 *   - 역할별 권한 매트릭스 (정보 표시 / 향후 멀티 사용자 도입 시 기준)
 */

const ROLES = ['관리자', '에디터', '조회자', 'API'];

const PROFILE_FORM_DEFAULT = { name: '', email: '', team: '', role: '관리자' };

const ROLE_COLORS = {
  관리자: { bg: 'var(--accent-soft)', color: 'var(--accent-text)' },
  에디터: { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  조회자: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
  API: { bg: '#F0EBFF', color: '#6B3FCB' },
};

// 권한 매트릭스 (정보용)
const PERMISSIONS = [
  { name: '판매량 업로드', r: ['✓', '✓', '', '✓'] },
  { name: '단가 업로드·수정', r: ['✓', '✓', '', ''] },
  { name: '원가표·메뉴 편집', r: ['✓', '✓', '', ''] },
  { name: '보고서 생성', r: ['✓', '✓', '', ''] },
  { name: '보고서 조회', r: ['✓', '✓', '✓', '✓'] },
  { name: '메뉴개발노트 작성', r: ['✓', '✓', '', ''] },
  { name: '백업·복원 실행', r: ['✓', '', '', ''] },
  { name: '구성원 관리', r: ['✓', '', '', ''] },
];

export default function Page() {
  const [profile, setProfileState] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', team: '', role: '' });

  // PIN 관리
  const { hasPin, setPin: savePin } = useSettingsAuth();
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');

  // 세션 정보
  const [lastLogin, setLastLogin] = useState(null);
  const [ipEntry, setIpEntry] = useState(null); // { ip, at } | null
  const [ipLoading, setIpLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const p = getProfile();
    setProfileState(p);
    setForm(p || PROFILE_FORM_DEFAULT);

    setLastLogin(getLastLogin());

    // 캐시된 IP 먼저 즉시 표시 → 백그라운드에서 최신 IP fetch
    const cached = getCachedIP();
    if (cached) setIpEntry(cached);

    fetchClientIP()
      .then(entry => {
        if (!alive) return;
        if (entry) setIpEntry(entry);
        setIpLoading(false);
      })
      .catch(() => {
        if (alive) setIpLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  function startEdit() {
    setForm({ ...(profile || PROFILE_FORM_DEFAULT) });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setForm({ ...(profile || PROFILE_FORM_DEFAULT) });
  }

  function saveEdit() {
    if (!form.name?.trim()) {
      showToast('이름은 비울 수 없습니다.', 'err');
      return;
    }
    const next = setProfile({
      name: form.name.trim(),
      email: form.email?.trim() || '',
      team: form.team?.trim() || '',
      role: form.role || '관리자',
    });
    setProfileState(next);
    setEditing(false);
    showToast('프로필이 저장되었습니다.', 'ok');
  }

  function handleSetPin(e) {
    e.preventDefault();
    if (pinInput.length < 4) {
      setPinError('PIN은 4자리 이상이어야 합니다.');
      return;
    }
    if (pinInput !== pinConfirm) {
      setPinError('PIN이 일치하지 않습니다.');
      return;
    }
    setPinError('');
    const wasSet = hasPin;
    savePin(pinInput);
    setPinInput('');
    setPinConfirm('');
    showToast('PIN이 설정되었습니다.', 'ok');
    import('@/lib/work-log')
      .then(m => m.logWork('SECURITY', wasSet ? '설정 PIN 변경' : '설정 PIN 설정'))
      .catch(() => {});
  }

  function handleClearPin() {
    savePin('');
    setPinInput('');
    setPinConfirm('');
    setPinError('');
    showToast('PIN이 해제되었습니다.', 'ok');
    import('@/lib/work-log').then(m => m.logWork('SECURITY', '설정 PIN 해제')).catch(() => {});
  }

  if (!profile) {
    return (
      <main className="main page-enter">
        <PageHeader breadcrumb={['설정 / 백업', '계정 관리']} title="계정 관리" />
        <div
          className="card"
          style={{ marginTop: 24, padding: '20px 24px', color: 'var(--text-3)' }}
        >
          프로필이 없습니다. 아래에서 설정하거나, 먼저 로그인 정보를 등록하세요.
          <div style={{ marginTop: 12 }}>
            <button
              className="btn primary sm"
              onClick={() => {
                const next = setProfile({ name: '관리자', email: '', team: '', role: '관리자' });
                setProfileState(next);
              }}
            >
              기본 프로필 생성
            </button>
          </div>
        </div>
        <PinSection
          hasPin={hasPin}
          pinInput={pinInput}
          setPinInput={setPinInput}
          pinConfirm={pinConfirm}
          setPinConfirm={setPinConfirm}
          onSetPin={handleSetPin}
          onClearPin={handleClearPin}
        />
      </main>
    );
  }

  return (
    <main className="main page-enter">
      <PageHeader
        breadcrumb={['설정 / 백업', '계정 관리']}
        title="계정 관리"
        sub="내 프로필 정보와 역할별 권한 기준을 확인하세요"
      />

      {/* 비밀번호 변경 */}
      <PasswordChangeCard />

      {/* 내 프로필 */}
      <div
        className="card"
        style={{ marginTop: 16, padding: 24, display: 'flex', gap: 24, alignItems: 'flex-start' }}
      >
        {/* 아바타 */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 28,
            flex: '0 0 72px',
          }}
        >
          {getInitial(profile.name)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {!editing ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{profile.name}</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 13,
                  color: 'var(--text-2)',
                  flexWrap: 'wrap',
                }}
              >
                {profile.team && <span>{profile.team}</span>}
                {profile.team && profile.email && <span style={{ color: 'var(--text-4)' }}>·</span>}
                {profile.email && <span style={{ fontFamily: 'monospace' }}>{profile.email}</span>}
                <span
                  className="chip"
                  style={{
                    background: ROLE_COLORS[profile.role]?.bg || 'var(--surface-2)',
                    color: ROLE_COLORS[profile.role]?.color || 'var(--text-2)',
                    marginLeft: 6,
                  }}
                >
                  {profile.role}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn sm" onClick={startEdit}>
                  <Icon.note style={{ width: 12, height: 12 }} />
                  프로필 수정
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                gap: 12,
              }}
            >
              <FormField label="이름" required>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="예: 이민학 주임"
                />
              </FormField>
              <FormField label="이메일">
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="예: rnd@7thpizza.com"
                />
              </FormField>
              <FormField label="팀">
                <input
                  className="input"
                  value={form.team}
                  onChange={e => setForm(f => ({ ...f, team: e.target.value }))}
                  placeholder="예: R&D팀"
                />
              </FormField>
              <FormField label="역할">
                <select
                  className="period-select"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </FormField>
              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'flex-end',
                  marginTop: 8,
                }}
              >
                <button className="btn" onClick={cancelEdit}>
                  취소
                </button>
                <button className="btn primary" onClick={saveEdit}>
                  저장
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 세션 정보 — 마지막 로그인 / 접속 IP */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>세션 정보</h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
          현재 브라우저 세션 기준 마지막 로그인 시각과 접속 IP입니다. IP는 외부 공개 API(
          <span style={{ fontFamily: 'monospace' }}>api.ipify.org</span>)로 조회합니다.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
            gap: 16,
          }}
        >
          <SettingTile
            variant="tile"
            label="마지막 로그인"
            value={lastLogin ? new Date(lastLogin).toLocaleString('ko-KR') : '기록 없음'}
            sub={lastLogin ? formatRelative(lastLogin) : '새 브라우저 세션이 시작되면 기록됩니다'}
          />
          <SettingTile
            variant="tile"
            label="접속 IP"
            value={ipEntry ? ipEntry.ip : ipLoading ? '조회 중…' : '외부 미연결'}
            sub={
              ipEntry
                ? `갱신: ${new Date(ipEntry.at).toLocaleString('ko-KR')}`
                : ipLoading
                  ? '잠시만 기다려 주세요'
                  : '외부 API 호출 실패 (오프라인 또는 차단)'
            }
            mono
          />
        </div>
      </div>

      {/* 설정 PIN 관리 */}
      <PinSection
        hasPin={hasPin}
        pinInput={pinInput}
        setPinInput={v => {
          setPinError('');
          setPinInput(v);
        }}
        pinConfirm={pinConfirm}
        setPinConfirm={v => {
          setPinError('');
          setPinConfirm(v);
        }}
        pinError={pinError}
        onSetPin={handleSetPin}
        onClearPin={handleClearPin}
      />

      {/* 역할별 권한 매트릭스 (정보 표시) */}
      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>역할별 권한 (정보)</h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
          향후 멀티 사용자 환경 도입 시 기준이 되는 역할·권한 표입니다. 현재는 표시용입니다.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 180 }}>권한</th>
                {ROLES.map(r => (
                  <th key={r} style={{ textAlign: 'center', width: 110 }}>
                    <span
                      className="chip"
                      style={{
                        background: ROLE_COLORS[r].bg,
                        color: ROLE_COLORS[r].color,
                        fontSize: 11,
                      }}
                    >
                      {r}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(row => (
                <tr key={row.name}>
                  <td style={{ fontWeight: 600 }}>{row.name}</td>
                  {row.r.map((v, i) => (
                    <td key={i} style={{ textAlign: 'center' }}>
                      {v ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: 'var(--positive-soft)',
                            color: 'var(--positive)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                          }}
                        >
                          {v}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-4)' }}>—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   하위 컴포넌트
============================================================ */

function FormField({ label, required, children }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          color: 'var(--text-3)',
          marginBottom: 4,
          fontWeight: 600,
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--negative)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function PinSection({
  hasPin,
  pinInput,
  setPinInput,
  pinConfirm,
  setPinConfirm,
  pinError,
  onSetPin,
  onClearPin,
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>설정 PIN 관리</h2>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>
        설정 페이지에 접근할 때 PIN을 요구합니다. PIN은 이 브라우저에만 저장됩니다.
      </p>
      <div
        style={{
          fontSize: 12,
          color: 'var(--text-3)',
          marginBottom: 16,
          padding: '8px 12px',
          background: 'var(--surface-2)',
          borderRadius: 8,
          lineHeight: 1.6,
        }}
      >
        ⚠ 이 PIN은 <b>보안용이 아니라 로컬 실수 방지용</b>입니다. 브라우저 localStorage에 평문으로
        저장되며, 같은 기기에 접근할 수 있으면 우회할 수 있습니다. 민감 정보 보호 수단으로 의존하지
        마세요.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>현재 PIN:</span>
        {hasPin ? (
          <span
            className="chip"
            style={{
              background: 'var(--positive-soft)',
              color: 'var(--positive)',
              fontWeight: 700,
            }}
          >
            설정됨
          </span>
        ) : (
          <span className="chip" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
            없음
          </span>
        )}
        {hasPin && (
          <button
            className="btn sm"
            style={{ color: 'var(--negative)', borderColor: 'var(--negative-soft)' }}
            onClick={onClearPin}
          >
            PIN 해제
          </button>
        )}
      </div>
      <form onSubmit={onSetPin}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
            gap: 12,
            maxWidth: 480,
          }}
        >
          <FormField label={hasPin ? '새 PIN' : 'PIN 설정'} required>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="4~8자리 숫자"
              maxLength={8}
            />
          </FormField>
          <FormField label="PIN 확인" required>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
              placeholder="다시 입력"
              maxLength={8}
            />
          </FormField>
        </div>
        {pinError && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--negative)', fontWeight: 600 }}>
            {pinError}
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <button className="btn primary sm" type="submit" disabled={!pinInput || !pinConfirm}>
            {hasPin ? 'PIN 변경' : 'PIN 설정'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordChangeCard() {
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
