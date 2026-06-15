'use client';

import { SampleCardSkeleton } from '@/components/ui/Skeleton';

export function SampleLoadingGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
      }}
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <SampleCardSkeleton key={index} />
      ))}
    </div>
  );
}
