'use client';
import { Icon } from '@/components/icons';

/** 데이터가 전혀 없을 때(관리/이슈/분류·태그 탭) 보여주는 빈 상태 안내. */
export function IngredientManageEmptyState() {
  return (
    <div className="card" style={{ minHeight: 180, display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
        <Icon.box style={{ width: 32, height: 32, marginBottom: 12, opacity: 0.4 }} />
        <div style={{ fontWeight: 600, marginBottom: 4 }}>아직 데이터가 없습니다</div>
        <div style={{ fontSize: 13 }}>
          <b>식자재 추가</b> 버튼으로 직접 등록하거나, 제때 가격 파일을 업로드해주세요.
        </div>
      </div>
    </div>
  );
}
