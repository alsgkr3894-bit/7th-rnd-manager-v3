import { redirect } from 'next/navigation';
import { MENU_SALES_ANALYSIS_ROUTE } from '@/lib/sales/navigation';

// 새 통합 페이지로 자동 이동 (v3 메뉴 재구성)
export default function Page() {
  redirect(MENU_SALES_ANALYSIS_ROUTE);
}
