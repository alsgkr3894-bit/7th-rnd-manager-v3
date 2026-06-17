'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { getInitial } from '@/lib/profile';
import { clearAuthCookie } from '@/lib/auth';

export function ProfileMenu({ profileRef, profileOpen, onToggle, profile }) {
  const router = useRouter();

  function handleLogout() {
    clearAuthCookie();
    window.location.href = '/login';
  }

  return (
    <div className="profile" ref={profileRef} style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={profileOpen}
        className="profile-btn"
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 8px',
          borderRadius: 8,
          font: 'inherit',
        }}
      >
        <div className="avatar">{profile ? getInitial(profile.name) : '?'}</div>
        <div className="who">
          <div className="name">{profile?.name || '...'}</div>
          <div className="role">{profile?.team || profile?.role || ''}</div>
        </div>
      </button>

      {profileOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 160,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-lg)',
            padding: 6,
            zIndex: 200,
            animation: 'fade-in 140ms ease both',
          }}
        >
          <button
            role="menuitem"
            onClick={() => {
              onToggle();
              router.push('/settings/account');
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              borderRadius: 7,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--text-1)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            계정 설정
          </button>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <button
            role="menuitem"
            onClick={handleLogout}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              borderRadius: 7,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--negative)',
              fontWeight: 600,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
