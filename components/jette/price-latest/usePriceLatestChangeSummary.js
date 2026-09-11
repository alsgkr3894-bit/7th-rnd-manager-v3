'use client';
import { useEffect, useMemo, useState } from 'react';
import { comparePriceLists, getPriceRowsByFileId, summarizePriceChanges } from '@/lib/price';

/**
 * files(getPriceFiles() 결과, updateDate 내림차순) 중 latestFileId 바로 다음 파일을
 * "직전 파일"로 보고, 그 파일의 price_rows와 현재 표시 중인 rows를 비교해
 * 인상/인하/신규/삭제 요약을 만든다.
 *
 * @param {object[]} files
 * @param {number|null} latestFileId
 * @param {object[]} rows - 현재 선택된(최신) 파일의 price_rows
 * @returns {{ prevFile: object|null, priceChangeSummary: object|null }}
 */
export function usePriceLatestChangeSummary(files, latestFileId, rows) {
  const [prevRows, setPrevRows] = useState([]);
  const latestIndex = files.findIndex(f => f.id === latestFileId);
  const prevFile = latestIndex >= 0 ? files[latestIndex + 1] || null : null;
  const prevFileId = prevFile?.id ?? null;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!prevFileId) {
        setPrevRows([]);
        return;
      }
      try {
        const r = await getPriceRowsByFileId(prevFileId);
        if (!alive) return;
        setPrevRows(r);
      } catch (err) {
        if (!alive) return;
        console.warn('[jette-price] 직전 파일 rows 로드 실패:', err);
        setPrevRows([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [prevFileId]);

  const priceChangeSummary = useMemo(() => {
    if (!prevFile) return null;
    return summarizePriceChanges(comparePriceLists(prevRows, rows));
  }, [prevFile, prevRows, rows]);

  return { prevFile, priceChangeSummary };
}
