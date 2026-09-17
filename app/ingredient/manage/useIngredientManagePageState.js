'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { previewIngredientDelete } from '@/lib/ingredient';
import { KEYS } from '@/lib/note/keys';
import { normalizeManageView, readInitialManageView } from './ingredientManageUtils';

/**
 * 식자재관리 페이지의 화면 상태(검색/필터/탭/강조/모달류)를 모아 관리하는 훅.
 * 데이터 로드(useIngredientManageData)·파생목록(useIngredientManageView)·저장/삭제 액션
 * (useIngredientManageActions)과는 분리해, page.jsx가 상태 배선 없이 JSX 조합만 하도록 한다.
 */
export function useIngredientManagePageState() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);
  const [catFilter, setCatFilter] = useLocalStorage(KEYS.INGREDIENT_CAT_FILTER, 'all', value =>
    typeof value === 'string' && value ? value : 'all'
  );
  const [tagFilter, setTagFilter] = useState('all');
  const [view, setViewState] = useState('manage');
  const setView = useCallback(nextView => {
    const normalized = normalizeManageView(nextView);
    setViewState(normalized);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (normalized === 'manage') url.searchParams.delete('view');
    else url.searchParams.set('view', normalized);
    window.history.replaceState(null, '', url);
  }, []);
  const [highlightId, setHighlightId] = useState(null);
  const [highlightProductCode, setHighlightProductCode] = useState(null);

  useEffect(() => {
    setView(readInitialManageView());
    // URL 파라미터 일괄 처리(한 번만): catFilter, query(검색어), highlight/productCode(행 강조)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('catFilter');
      const queryParam = params.get('query');
      const highlightParam = params.get('highlight');
      const productCodeParam = params.get('productCode');
      if (catParam) setCatFilter(catParam);
      if (queryParam) setSearch(queryParam);
      if (highlightParam) setHighlightId(highlightParam);
      if (productCodeParam) setHighlightProductCode(productCodeParam);
      if (catParam || queryParam || highlightParam || productCodeParam) {
        const url = new URL(window.location.href);
        url.searchParams.delete('catFilter');
        url.searchParams.delete('query');
        url.searchParams.delete('highlight');
        url.searchParams.delete('productCode');
        window.history.replaceState(null, '', url);
      }
    }
    // setView(useCallback)·setCatFilter(useState setter) 모두 안정적 참조 → 사실상 mount 1회 실행.
  }, [setView, setCatFilter]);
  // highlightId 자동 해제는 IngredientManagePanel에서 rows 로드 후 처리 (onHighlightClear)
  const clearHighlight = useCallback(() => {
    setHighlightId(null);
    setHighlightProductCode(null);
  }, []);

  const [formTarget, setFormTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(null);
  const [deletePreview, setDeletePreview] = useState(null);
  const deletePreviewRequestRef = useRef(0);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [substituteSource, setSubstituteSource] = useState(null);
  const [dedupeConfirm, setDedupeConfirm] = useState(false);
  const [dedupeBusy, setDedupeBusy] = useState(false);

  useEffect(() => {
    if (!deletePending) {
      deletePreviewRequestRef.current += 1;
      setDeletePreview(null);
    }
  }, [deletePending]);

  const handleDeleteStart = useCallback(async row => {
    const requestId = deletePreviewRequestRef.current + 1;
    deletePreviewRequestRef.current = requestId;
    setDeletePending(row);
    setDeletePreview(null);
    if (row?.id && row?.isManual && !row?.productCode) {
      try {
        const preview = await previewIngredientDelete(row.id);
        if (deletePreviewRequestRef.current === requestId) {
          setDeletePreview(preview?.ingredient?.id === row.id ? preview : null);
        }
      } catch {
        // preview 실패는 삭제 흐름에 영향 없음
      }
    }
  }, []);

  return {
    search,
    setSearch,
    debouncedSearch,
    catFilter,
    setCatFilter,
    tagFilter,
    setTagFilter,
    view,
    setView,
    highlightId,
    highlightProductCode,
    clearHighlight,
    formTarget,
    setFormTarget,
    deletePending,
    setDeletePending,
    deletePreview,
    handleDeleteStart,
    resetConfirm,
    setResetConfirm,
    resetting,
    setResetting,
    confirmRemove,
    setConfirmRemove,
    substituteSource,
    setSubstituteSource,
    dedupeConfirm,
    setDedupeConfirm,
    dedupeBusy,
    setDedupeBusy,
  };
}
