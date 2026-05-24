import { redirect } from 'next/navigation';

// 새 통합 페이지로 자동 이동 (v3 메뉴 재구성)
export default function Page() {
  redirect('/cost/personal');
}
