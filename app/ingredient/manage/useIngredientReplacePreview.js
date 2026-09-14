'use client';
import { useEffect, useState } from 'react';
import { previewIngredientProductReplace } from '@/lib/ingredient';

/**
 * 수정 폼에서 "단종 처리" + 대체 식자재를 고르는 즉시, 저장 전에 영향 범위(레시피/세트/엣지
 * 개수)를 미리 보여준다. SubstituteLinkModal의 동일 미리보기와 같은 API를 쓴다.
 * @param {string} productCode 대체될(단종 처리될) 원본 제품코드
 * @param {boolean} enabled 단종 체크 + 대체 코드가 선택된 상태일 때만 조회
 */
export function useIngredientReplacePreview(productCode, enabled) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !productCode) {
      setPreview(null);
      setError(null);
      return;
    }
    let alive = true;
    setLoading(true);
    previewIngredientProductReplace(productCode)
      .then(result => {
        if (alive) {
          setPreview(result);
          setError(null);
        }
      })
      .catch(err => {
        if (alive) {
          setPreview(null);
          setError(err instanceof Error ? err.message : '영향 범위를 확인하지 못했습니다.');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [productCode, enabled]);

  return { preview, loading, error };
}
