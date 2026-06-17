'use client';
import { Icon } from '@/components/icons';
import { FormField } from '@/components/settings/FormField';
import { SettingTile } from '@/components/ui/SettingTile';
import { formatRelative } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/auth/accounts';
import { getInitial } from '@/lib/profile';

export const ACCOUNT_ROLES = ['관리자', '에디터', '조회자', 'API'];
export const ROLE_COLORS = {
  관리자: { bg: 'var(--accent-soft)', color: 'var(--accent-text)' },
  에디터: { bg: 'var(--positive-soft)', color: 'var(--positive)' },
  조회자: { bg: 'var(--surface-2)', color: 'var(--text-2)' },
  API: { bg: '#F0EBFF', color: '#6B3FCB' },
};
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

const S_CARD_MT = { marginTop: 16 };
const S_SECTION_TITLE = { fontSize: 15, fontWeight: 700, marginBottom: 4 };
const S_SECTION_DESC = { fontSize: 13, color: 'var(--text-3)', marginBottom: 16 };
const S_MUTED_DOT = { color: 'var(--text-4)' };
const S_PERM_CHECK = {
  display: 'inline-flex',
  width: 24,
  height: 24,
  borderRadius: 6,
  background: 'var(--positive-soft)',
  color: 'var(--positive)',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
};

export function AccountProfileCard({ profile, editing, form, onStartEdit, onCancelEdit, onSaveEdit, onFormChange }) {
  return (
    <div
      className="card"
      style={{ marginTop: 16, padding: 24, display: 'flex', gap: 24, alignItems: 'flex-start' }}
    >
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
              {profile.team && profile.email && <span style={S_MUTED_DOT}>·</span>}
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
              <button className="btn sm" onClick={onStartEdit}>
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
                onChange={e => onFormChange('name', e.target.value)}
                placeholder="예: 이민학 주임"
              />
            </FormField>
            <FormField label="이메일">
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={e => onFormChange('email', e.target.value)}
                placeholder="예: rnd@7thpizza.com"
              />
            </FormField>
            <FormField label="팀">
              <input
                className="input"
                value={form.team}
                onChange={e => onFormChange('team', e.target.value)}
                placeholder="예: R&D팀"
              />
            </FormField>
            <FormField label="역할">
              <select
                className="period-select"
                value={form.role}
                onChange={e => onFormChange('role', e.target.value)}
                style={{ width: '100%' }}
              >
                {ACCOUNT_ROLES.map(r => (
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
              <button className="btn" onClick={onCancelEdit}>
                취소
              </button>
              <button className="btn primary" onClick={onSaveEdit}>
                저장
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AccountSessionCard({ lastLogin, ipEntry, ipLoading, onRefreshIP }) {
  return (
    <div className="card" style={S_CARD_MT}>
      <h2 style={S_SECTION_TITLE}>세션 정보</h2>
      <p style={S_SECTION_DESC}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SettingTile
            variant="tile"
            label="접속 IP"
            value={ipEntry ? ipEntry.ip : ipLoading ? '조회 중…' : '—'}
            sub={
              ipEntry
                ? `갱신: ${new Date(ipEntry.at).toLocaleString('ko-KR')}`
                : ipLoading
                  ? '잠시만 기다려 주세요'
                  : 'api.ipify.org 조회 — 버튼을 눌러 실행'
            }
            mono
          />
          {!ipLoading && (
            <button
              className="btn sm ghost"
              onClick={onRefreshIP}
              style={{ fontSize: 11, alignSelf: 'flex-start' }}
            >
              IP 조회
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

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
    <div className="card" style={S_CARD_MT}>
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

export function AccountPermissionsMatrix() {
  return (
    <div className="card" style={S_CARD_MT}>
      <h2 style={S_SECTION_TITLE}>역할별 권한 (정보)</h2>
      <p style={S_SECTION_DESC}>
        향후 멀티 사용자 환경 도입 시 기준이 되는 역할·권한 표입니다. 현재는 표시용입니다.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 180 }}>권한</th>
              {ACCOUNT_ROLES.map(r => (
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
                    {v ? <span style={S_PERM_CHECK}>{v}</span> : <span style={S_MUTED_DOT}>—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
