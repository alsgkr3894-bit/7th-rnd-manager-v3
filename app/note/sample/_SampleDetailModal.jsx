'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MENU_MASTER_ROUTE } from '@/lib/cost/routes';
import { useModalShell } from '@/hooks/useModalShell';
import { usePinchZoom } from '@/hooks/usePinchZoom';
import { SampleDetailBody } from './detail-modal/SampleDetailBody';
import { SampleDetailHeader } from './detail-modal/SampleDetailHeader';
import { SampleDetailPhotoPanel } from './detail-modal/SampleDetailPhotoPanel';
import { SampleDetailShell } from './detail-modal/SampleDetailShell';
import {
  buildSampleDetailModel,
  getCurrentPhotoState,
  normalizeSampleDetailActions,
} from './detail-modal/sampleDetailModalUtils';

export function SampleDetailModal({ sample = {}, onClose, onEdit, onDelete }) {
  const router = useRouter();
  const [photoIdx, setPhotoIdx] = useState(0);
  const model = buildSampleDetailModel(sample);
  const { currentPhotoIdx, currentPhoto } = getCurrentPhotoState(model.photos, photoIdx);
  const { imgRef, scale, resetScale } = usePinchZoom();
  const { closeModal, edit, remove } = normalizeSampleDetailActions({
    onClose,
    onEdit,
    onDelete,
  });
  const { containerRef, isClosing, close } = useModalShell(closeModal);

  useEffect(() => {
    resetScale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoIdx]);

  function openMenuMaster() {
    router.push(MENU_MASTER_ROUTE);
    closeModal();
  }

  return (
    <SampleDetailShell containerRef={containerRef} isClosing={isClosing}>
      <SampleDetailHeader
        model={model}
        onOpenMenuMaster={openMenuMaster}
        onEdit={edit}
        onDelete={remove}
        onClose={close}
      />
      <div
        style={{
          overflowY: 'auto',
          flex: 1,
          display: 'grid',
          gridTemplateColumns: model.photos.length ? '1fr 1fr' : '1fr',
        }}
      >
        <SampleDetailPhotoPanel
          photos={model.photos}
          currentPhoto={currentPhoto}
          currentPhotoIdx={currentPhotoIdx}
          title={model.title}
          names={model.names}
          scale={scale}
          imgRef={imgRef}
          setPhotoIdx={setPhotoIdx}
        />
        <SampleDetailBody model={model} />
      </div>
    </SampleDetailShell>
  );
}
