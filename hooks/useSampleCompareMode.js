'use client';
import { useState, useMemo } from 'react';

/**
 * 샘플 비교 모드의 선택 Set과 파생 데이터를 관리한다.
 * 최대 3개까지 선택 가능하다.
 *
 * @param {object[]} samples - 전체 샘플 목록 (compareItems 조회용)
 */
export function useSampleCompareMode(samples) {
  const [compareMode, setCompareMode] = useState(false);
  const [compareSet,  setCompareSet]  = useState(new Set());
  const [showCompare, setShowCompare] = useState(false);

  function toggleCompare(id) {
    setCompareSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  }

  function exitCompareMode() {
    setCompareMode(false);
    setCompareSet(new Set());
    setShowCompare(false);
  }

  const compareItems = useMemo(
    () => [...compareSet].map(id => samples.find(s => s.id === id)).filter(Boolean),
    [compareSet, samples],
  );

  // 카드 렌더마다 배열 재생성을 막기 위해 순서 Map으로 제공
  const compareIdxMap = useMemo(() => {
    const m = new Map();
    [...compareSet].forEach((id, i) => m.set(id, i));
    return m;
  }, [compareSet]);

  return {
    compareMode, setCompareMode,
    compareSet, toggleCompare,
    showCompare, setShowCompare,
    compareItems, compareIdxMap,
    exitCompareMode,
  };
}
