'use client';
import { Icon } from '@/components/icons';
import { FormField } from '@/components/settings/FormField';
import { getInitial } from '@/lib/profile';
import { ACCOUNT_ROLES, ROLE_COLORS } from './_accountSettingsConstants';

export function AccountProfileCard({
  profile,
  editing,
  form,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onFormChange,
}) {
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
