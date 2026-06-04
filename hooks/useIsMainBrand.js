'use client';
import { useEffect, useState } from 'react';
import { getActiveBrandId } from '@/lib/active-brand';

/**
 * 현재 활성 브랜드가 7번가(main)인지 여부.
 *
 * 7번가 전용 기능(마스터 시드 버튼 등)을 다른 브랜드에서 숨길 때 사용.
 * SSR/첫 렌더는 항상 true(서버는 localStorage를 모르므로 'main' 기준)로 두고,
 * 마운트 후 실제 활성 브랜드로 교정한다 → 하이드레이션 불일치 방지.
 */
export function useIsMainBrand() {
  const [isMain, setIsMain] = useState(true);
  useEffect(() => { setIsMain(getActiveBrandId() === 'main'); }, []);
  return isMain;
}
