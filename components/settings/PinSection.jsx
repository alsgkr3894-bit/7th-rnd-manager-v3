'use client';

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

export function PinSection({
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
