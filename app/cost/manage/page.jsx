import { redirect } from 'next/navigation';
import { COST_COMMON_GROUPS_ROUTE } from '@/lib/cost/routes';

export default function Page() {
  redirect(COST_COMMON_GROUPS_ROUTE);
}
