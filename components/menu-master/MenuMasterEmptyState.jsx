'use client';

import { Icon } from '@/components/icons';

export function MenuMasterEmptyState({ isMain, seeding, onSeed }) {
  return (
    <div className="empty-state" style={{ padding: '60px 20px' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'var(--surface-2)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-4)',
          border: '1px solid var(--border)',
        }}
      >
        <Icon.box style={{ width: 28, height: 28 }} />
      </div>
      <div className="empty-title">메뉴 마스터 데이터가 없습니다</div>
      <div className="empty-sub">
        {isMain
          ? '기본 코드 등록 버튼으로 전체 코드 체계를 불러오세요.'
          : '메뉴 추가 버튼으로 메뉴를 직접 등록하세요.'}
      </div>
      {isMain && (
        <button
          className="btn primary"
          onClick={onSeed}
          disabled={seeding}
          style={{ marginTop: 4 }}
        >
          <Icon.plus style={{ width: 14, height: 14 }} />
          {seeding ? '등록 중…' : '기본 코드 등록'}
        </button>
      )}
    </div>
  );
}
