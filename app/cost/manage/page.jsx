'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 공통 관리는 원가 레시피 페이지의 탭으로 통합됨.
 * 기존 /cost/manage 북마크는 /cost/recipe?tab=groups 로 redirect.
 */
export default function Page() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/cost/recipe?tab=groups');
  }, [router]);
  return (
    <main className="main">
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
        원가 레시피로 이동 중…
      </div>
    </main>
  );
}
