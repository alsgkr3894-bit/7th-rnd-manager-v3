'use client';
import { Icon } from '@/components/icons';

export function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      className="icon-btn"
      onClick={onToggle}
      aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {dark ? (
        <Icon.sun aria-hidden="true" style={{ width: 18, height: 18 }} />
      ) : (
        <Icon.moon aria-hidden="true" style={{ width: 18, height: 18 }} />
      )}
    </button>
  );
}
