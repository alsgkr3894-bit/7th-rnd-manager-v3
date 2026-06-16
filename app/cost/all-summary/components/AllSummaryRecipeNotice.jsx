import { Icon } from '@/components/icons';

export function AllSummaryRecipeNotice() {
  return (
    <div
      className="card"
      style={{
        padding: '12px 16px',
        marginBottom: 8,
        color: 'var(--text-3)',
        fontSize: 13,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <Icon.doc style={{ width: 16, height: 16, opacity: 0.5, flexShrink: 0 }} />
      레시피가 등록된 메뉴가 없습니다. 메뉴 마스터에서 레시피를 먼저 작성해주세요.
    </div>
  );
}
