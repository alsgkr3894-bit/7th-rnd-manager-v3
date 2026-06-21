'use client';
import { ROLE_LABELS } from '@/lib/auth/accounts';
import { ROLE_COLORS } from './_accountSettingsConstants';

export function AccountMembersCard({
  accounts,
  activeId,
  addingAccount,
  newAccForm,
  addingBusy,
  isAdmin,
  onToggleAdding,
  onNewAccFormChange,
  onAddAccount,
  onSwitchAccount,
  onDeleteConfirm,
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <div>
          <div className="card-title">구성원 계정</div>
          <div className="card-sub">활성 계정의 역할이 앱 내 수정 권한을 제어합니다</div>
        </div>
        {isAdmin && (
          <button className="btn sm" onClick={onToggleAdding}>
            {addingAccount ? '취소' : '+ 계정 추가'}
          </button>
        )}
      </div>

      {addingAccount && isAdmin && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            padding: '12px 0 8px',
            borderBottom: '1px solid var(--divider)',
            marginBottom: 8,
          }}
        >
          <input
            className="input"
            style={{ flex: 1, minWidth: 120 }}
            placeholder="이름"
            value={newAccForm.name}
            onChange={e => onNewAccFormChange('name', e.target.value)}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: 140 }}
            placeholder="이메일 (선택)"
            value={newAccForm.email}
            onChange={e => onNewAccFormChange('email', e.target.value)}
          />
          <select
            className="input"
            style={{ width: 100 }}
            value={newAccForm.role}
            onChange={e => onNewAccFormChange('role', e.target.value)}
          >
            <option value="admin">관리자</option>
            <option value="viewer">조회자</option>
          </select>
          <button className="btn primary sm" disabled={addingBusy} onClick={onAddAccount}>
            {addingBusy ? '추가 중…' : '추가'}
          </button>
        </div>
      )}

      {accounts.length === 0 ? (
        <div style={{ color: 'var(--text-4)', fontSize: 13, padding: '12px 0' }}>
          계정 없음 — 자동 관리자 계정이 생성됩니다
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th style={{ width: 80 }}>역할</th>
              <th style={{ width: 100 }}>상태</th>
              {isAdmin && <th style={{ width: 60 }} />}
            </tr>
          </thead>
          <tbody>
            {accounts.map(acc => {
              const isActive = acc.id === activeId;
              return (
                <tr
                  key={acc.id}
                  style={isActive ? { background: 'var(--accent-soft)' } : undefined}
                >
                  <td style={{ fontWeight: isActive ? 700 : 500 }}>{acc.name}</td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {acc.email || '—'}
                  </td>
                  <td>
                    <span
                      className="chip"
                      style={{
                        background:
                          acc.role === 'admin' ? 'var(--accent-soft)' : 'var(--surface-2)',
                        color: acc.role === 'admin' ? 'var(--accent-text)' : 'var(--text-2)',
                      }}
                    >
                      {ROLE_LABELS[acc.role] || acc.role}
                    </span>
                  </td>
                  <td>
                    {isActive ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                        활성
                      </span>
                    ) : (
                      <button
                        className="btn sm"
                        style={{ fontSize: 11 }}
                        onClick={() => onSwitchAccount(acc)}
                      >
                        전환
                      </button>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      {accounts.length > 1 && (
                        <button
                          className="btn sm"
                          style={{ color: 'var(--negative)', fontSize: 11 }}
                          onClick={() => onDeleteConfirm(acc.id)}
                        >
                          삭제
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
