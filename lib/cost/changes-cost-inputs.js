/**
 * lib/cost/changes-cost-inputs.js — 식자재 저장이 메뉴 원가를 움직일 수 있는 입력을 바꿨는지
 *
 * 수동 단가(priceOverride)·포장수량(baseQuantity)·포장 단위(baseUnitType)가 바뀌면 그 식자재를 쓰는
 * 메뉴 원가가 달라진다. 이름·분류·사진 같은 저장은 원가와 무관하니 상승 알림 계산을 건너뛴다.
 * 새 식자재(복사 포함)는 아직 쓰는 레시피가 없으니 대상이 아니다. 순수 함수.
 */
const numOrNull = value => {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function changesCostInputs(formTarget, formData) {
  if (!formTarget || formTarget === 'new' || formTarget.__copyFrom) return false;
  return (
    numOrNull(formData?.priceOverride) !== numOrNull(formTarget.priceOverride) ||
    numOrNull(formData?.baseQuantity) !== numOrNull(formTarget.baseQuantity) ||
    String(formData?.baseUnitType ?? formTarget.baseUnitType ?? '') !==
      String(formTarget.baseUnitType ?? '')
  );
}
