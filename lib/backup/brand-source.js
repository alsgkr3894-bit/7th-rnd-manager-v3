import { getBrandById } from '@/lib/brand-master';
import { dbNameFor } from '@/lib/db/constants';

function text(value) {
  return String(value ?? '').trim();
}

export function buildBackupSourceMetadata(brandId) {
  const sourceBrandId = text(brandId) || 'main';
  const brand = getBrandById(sourceBrandId, { includeHidden: true });
  return {
    sourceBrandId,
    sourceBrandName: brand?.name || sourceBrandId,
    sourceDbName: dbNameFor(sourceBrandId),
    sharedDbName: dbNameFor('main'),
  };
}

export function backupSourceMetadataOf(backup) {
  const sourceBrandId = text(backup?.sourceBrandId || backup?.brandId);
  const sourceBrandName = text(backup?.sourceBrandName || backup?.brandName || sourceBrandId);
  const sourceDbName = text(backup?.sourceDbName);
  const sharedDbName = text(backup?.sharedDbName);
  return {
    sourceBrandId,
    sourceBrandName,
    sourceDbName,
    sharedDbName,
    hasSourceBrand: Boolean(sourceBrandId),
  };
}

export function isBackupSourceMismatch(backup, targetBrandId) {
  const source = backupSourceMetadataOf(backup).sourceBrandId;
  const target = text(targetBrandId);
  return Boolean(source && target && source !== target);
}
