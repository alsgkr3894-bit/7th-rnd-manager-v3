'use client';
import { sideTotalCost } from '@/lib/cost/side-detail';
import { DetailEditModal } from '@/components/cost/shared/DetailEditModal';

export function SideDetailEditModal(props) {
  return (
    <DetailEditModal
      {...props}
      calcCost={sideTotalCost}
      infoBanner="식재료뿐 아니라 용기·박스·스티커 등 포장재 원가도 포함하세요."
      listIdPrefix="side-detail"
    />
  );
}
