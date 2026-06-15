import { redirect } from 'next/navigation';
import { LEGACY_RECIPE_MASTER_REDIRECT_ROUTE } from '@/lib/cost/routes';

export default function Page() {
  redirect(LEGACY_RECIPE_MASTER_REDIRECT_ROUTE);
}
