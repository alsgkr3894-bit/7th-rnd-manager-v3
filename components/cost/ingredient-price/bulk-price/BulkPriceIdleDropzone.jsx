'use client';

import { UploadDropzone } from '@/components/ui/UploadDropzone';

export function BulkPriceIdleDropzone({ onFile, onError }) {
  return (
    <UploadDropzone
      accept={['.csv', '.xlsx', '.xls']}
      title="파일을 선택하거나 드래그하세요"
      onFile={(file, err) => {
        if (err) {
          onError(err);
          return;
        }
        onFile(file);
      }}
    />
  );
}
