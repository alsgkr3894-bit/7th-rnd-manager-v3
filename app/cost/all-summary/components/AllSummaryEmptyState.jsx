import { Icon } from '@/components/icons';

export function AllSummaryEmptyState() {
  return (
    <div
      className="card"
      style={{ marginTop: 24, minHeight: 260, display: 'grid', placeItems: 'center' }}
    >
      <div style={{ textAlign: 'center', color: 'var(--text-4)' }}>
        <div className="empty-icon-wrap">
          <Icon.calc style={{ width: 32, height: 32 }} />
        </div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>등록된 메뉴가 없습니다</div>
        <div style={{ fontSize: 13 }}>
          먼저 <b>메뉴 판매가</b>에서 메뉴를 등록하고
          <br />
          <b>메뉴 마스터</b>에서 레시피를 작성해주세요.
        </div>
      </div>
    </div>
  );
}
