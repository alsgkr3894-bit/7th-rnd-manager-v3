import { redirect } from 'next/navigation';
import { LEGACY_COST_DETAIL_REDIRECT_ROUTE } from '@/lib/cost/routes';

export default function Page() {
  redirect(LEGACY_COST_DETAIL_REDIRECT_ROUTE);
}
