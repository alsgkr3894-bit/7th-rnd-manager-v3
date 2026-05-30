'use client';
import { pizzaBaseCost } from '@/lib/cost/pizza-detail';
import { DetailEditModal } from '@/components/cost/shared/DetailEditModal';

export function PizzaDetailEditModal({ menu, ...props }) {
  return (
    <DetailEditModal
      menu={menu}
      {...props}
      calcCost={pizzaBaseCost}
      costLabel="베이스 원가 (엣지 제외)"
      costRatePrefix="베이스율"
      costRateSuffix=" (엣지 추가 시 더 높아짐)"
      titleSuffix={menu.size}
      infoBanner="베이스 구성품(소스·치즈·토핑 등)만 입력하세요. 엣지·도우는 별도 원가표에서 종합 원가표에 자동 합산됩니다."
      listIdPrefix="pizza-detail"
      extraSaveFields={{ size: menu.size }}
    />
  );
}
