'use client';
import { setTotalCost } from '@/lib/cost/set-detail';
import { DetailEditModal } from '@/components/cost/shared/DetailEditModal';

export function SetDetailEditModal(props) {
  return (
    <DetailEditModal
      {...props}
      calcCost={setTotalCost}
      infoBanner="1차 구현 — 식자재·포장재 직접 입력. 기존 메뉴 원가 참조는 다음 단계에서 추가됩니다."
      listIdPrefix="set-detail"
    />
  );
}
