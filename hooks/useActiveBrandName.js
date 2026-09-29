'use client';

import { useEffect, useState } from 'react';
import { getActiveBrand } from '@/lib/active-brand';

/**
 * 현재 선택된 브랜드 이름. 서버 렌더에는 localStorage가 없어 값이 달라지므로(하이드레이션
 * 불일치) 마운트 후에 읽는다. 브랜드를 바꾸면 페이지가 새로고침되니 한 번만 읽으면 된다.
 */
export function useActiveBrandName() {
  const [name, setName] = useState('');
  useEffect(() => {
    setName(getActiveBrand()?.name || '');
  }, []);
  return name;
}
