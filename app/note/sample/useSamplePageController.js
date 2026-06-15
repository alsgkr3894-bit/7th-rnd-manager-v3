'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useSampleBatchMode } from '@/hooks/useSampleBatchMode';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useSampleCompareMode } from '@/hooks/useSampleCompareMode';
import { buildSamplePageControllerProps } from './samplePageControllerProps';
import { useSamplePageState } from './useSamplePageState';
import { useSampleRecordActions } from './useSampleRecordActions';

export function useSamplePageController() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const pageState = useSamplePageState({ searchParams, pathname });
  const { samples, setSamples, setDetailRec, reload } = pageState;

  const batch = useSampleBatchMode(
    ids => setSamples(prev => prev.filter(sample => !ids.includes(sample.id))),
    reload
  );

  const { showConfirm, confirmElement } = useConfirmDialog();

  const recordActions = useSampleRecordActions({
    setSamples,
    setDetailRec,
    reload,
    showConfirm,
  });

  const compare = useSampleCompareMode(samples);

  return buildSamplePageControllerProps({
    router,
    pageState,
    batch,
    compare,
    recordActions,
    confirmElement,
  });
}
