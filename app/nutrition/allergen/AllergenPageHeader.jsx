'use client';
import { Icon } from '@/components/icons';
import { PageHeader } from '@/components/ui/PageHeader';

export function AllergenPageHeader({ exportDisabled, onExport }) {
  return (
    <PageHeader
      breadcrumb={['영양성분', '알레르기 정보']}
      title="알레르기 정보"
      masterSource
      sub="식자재 관리에서 식자재별 알레르기 항목을 체크하면 자동으로 메뉴에 매칭됩니다"
      actions={
        <button className="btn" onClick={onExport} disabled={exportDisabled}>
          <Icon.download style={{ width: 14, height: 14 }} /> 엑셀로 내보내기
        </button>
      }
    />
  );
}
