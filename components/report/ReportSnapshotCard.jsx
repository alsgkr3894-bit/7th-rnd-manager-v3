import { Icon } from '@/components/icons';

export function ReportSnapshotCard() {
  return (
    <div className="card warn-card" style={{ marginTop: 0 }}>
      <div className="warn-ico">
        <Icon.alert style={{ width: 16, height: 16 }} />
      </div>
      <div>
        <div className="warn-title">보고서는 생성 시점의 데이터로 고정돼요</div>
        <div className="warn-text">
          제때 단가나 판매량이 이후 수정되어도 기존 보고서는 그대로 보관돼요. 다시 만들고 싶으면{' '}
          <b>새 보고서 생성</b>을 눌러주세요.
        </div>
      </div>
    </div>
  );
}
