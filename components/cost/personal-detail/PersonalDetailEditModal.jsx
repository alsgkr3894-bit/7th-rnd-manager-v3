'use client';
import { personalTotalCost } from '@/lib/cost/personal-detail';
import { DetailEditModal } from '@/components/cost/shared/DetailEditModal';

export function PersonalDetailEditModal(props) {
  return <DetailEditModal {...props} calcCost={personalTotalCost} listIdPrefix="personal-detail" />;
}
