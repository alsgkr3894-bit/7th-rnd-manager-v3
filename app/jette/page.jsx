import { redirect } from 'next/navigation';

// 상위 경로 진입 시 첫 번째 자식으로 자동 이동
export default function Page() {
  redirect('/jette/price-compare');
}
