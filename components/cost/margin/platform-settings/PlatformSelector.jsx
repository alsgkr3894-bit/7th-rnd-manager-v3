'use client';
import { Icon } from '@/components/icons';

function PlatformRow({ platform, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '10px 16px',
        fontSize: 13,
        border: 'none',
        cursor: 'pointer',
        background: isSelected ? 'var(--accent)' : 'transparent',
        color: isSelected ? '#fff' : 'var(--text-1)',
        fontWeight: isSelected ? 600 : 400,
      }}
    >
      {platform.name}
      {platform.fees?.length > 0 && (
        <span style={{ fontSize: 11, marginLeft: 5, opacity: 0.7 }}>({platform.fees.length})</span>
      )}
    </button>
  );
}

export function PlatformSelector({ platforms, selectedId, onSelect, onAdd }) {
  return (
    <div
      style={{
        width: 160,
        borderRight: '1px solid var(--divider)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      {platforms.map(platform => (
        <PlatformRow
          key={platform.id}
          platform={platform}
          isSelected={platform.id === selectedId}
          onClick={() => onSelect(platform.id)}
        />
      ))}
      <button
        type="button"
        onClick={onAdd}
        style={{
          textAlign: 'left',
          padding: '10px 16px',
          fontSize: 12,
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 2,
        }}
      >
        <Icon.plus style={{ width: 12, height: 12 }} /> 플랫폼 추가
      </button>
    </div>
  );
}
