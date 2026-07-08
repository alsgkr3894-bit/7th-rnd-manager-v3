'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SampleWriteRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/note/write?type=sample');
  }, [router]);

  return (
    <main className="main">
      <div className="card" style={{ padding: 20 }}>
        통합 작성 화면으로 이동 중입니다.
      </div>
    </main>
  );
}
