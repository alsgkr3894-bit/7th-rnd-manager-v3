import { createHash, randomUUID } from 'node:crypto';

import { ALL_STORES } from '../lib/db/constants.js';
import { SHARED_STORE_NAMES } from '../lib/db/module-stores.js';
import { STORE_CATALOG_SEED } from './store-catalog.mjs';

const KNOWN_STORE_SET = new Set(ALL_STORES);
const STORE_CATALOG_BY_NAME = new Map(STORE_CATALOG_SEED.map(store => [store.name, store]));
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

function text(value) {
  return String(value ?? '').trim();
}

function isPlainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseDate(value) {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function jsonHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function int32(value) {
  if (!Number.isInteger(value)) return null;
  if (value < INT32_MIN || value > INT32_MAX) return null;
  return value;
}

function recordKeyOf(storeName, row, index) {
  const keyPath = STORE_CATALOG_BY_NAME.get(storeName)?.keyPath;
  if (keyPath && row[keyPath] != null) return String(row[keyPath]);
  if (row.id != null) return String(row.id);
  return `__index:${index}`;
}

function localStorageCategoryOf(key) {
  if (/^v3:session-|^v3:auth-|^v3:settings-pin/.test(key)) return 'client_only';
  if (/theme|density|fontScale|sidebar|palette/i.test(key)) return 'browser_preference';
  if (/^saved_views_v1/.test(key)) return 'saved_view';
  return 'persistent_setting';
}

function localStorageMigrateModeOf(category) {
  if (category === 'client_only') return 'skip';
  if (category === 'browser_preference') return 'review';
  return 'copy';
}

function sourceBrandIdOf(backup, fallback = 'main') {
  return text(backup?.sourceBrandId || backup?.brandId || fallback) || 'main';
}

function sourceBrandNameOf(backup, brandId) {
  return text(backup?.sourceBrandName || backup?.brandName || brandId) || brandId;
}

export function validateBackupShape(backup) {
  if (!isPlainRecord(backup)) {
    return ['Backup payload must be an object.'];
  }
  if (!isPlainRecord(backup.stores)) {
    return ['Backup payload must contain a stores object.'];
  }

  const errors = [];
  for (const [storeName, rows] of Object.entries(backup.stores)) {
    if (!Array.isArray(rows)) {
      errors.push(`Store '${storeName}' must be an array.`);
      continue;
    }
    rows.forEach((row, index) => {
      if (!isPlainRecord(row)) errors.push(`Store '${storeName}' row ${index} must be an object.`);
    });
  }
  if (backup.localStorage != null && !isPlainRecord(backup.localStorage)) {
    errors.push('localStorage must be an object when present.');
  }
  return errors;
}

export function buildImportPlan(backup, options = {}) {
  const shapeErrors = validateBackupShape(backup);
  const targetBrandId = text(options.targetBrandId) || sourceBrandIdOf(backup);
  const includeShared = Boolean(options.includeShared || targetBrandId === 'main');
  const importLocalStorage = options.importLocalStorage !== false;
  const importedAt = new Date();
  const warnings = [];
  const errors = [...shapeErrors];
  const storePlans = [];

  if (errors.length === 0) {
    for (const [storeName, rows] of Object.entries(backup.stores)) {
      if (!KNOWN_STORE_SET.has(storeName)) {
        warnings.push(`Unknown store '${storeName}' skipped.`);
        continue;
      }

      const isShared = SHARED_STORE_NAMES.has(storeName);
      if (isShared && !includeShared) {
        warnings.push(`Shared store '${storeName}' skipped for target brand '${targetBrandId}'.`);
        continue;
      }

      const seenKeys = new Set();
      const duplicates = new Set();
      const brandId = isShared ? 'main' : targetBrandId;
      const rowsForDb = rows.map((row, index) => {
        const recordKey = recordKeyOf(storeName, row, index);
        if (seenKeys.has(recordKey)) duplicates.add(recordKey);
        seenKeys.add(recordKey);
        return {
          id: randomUUID(),
          brandId,
          storeName,
          scope: isShared ? 'SHARED' : 'BRAND',
          recordKey,
          legacyNumericId: int32(row.id),
          data: row,
          dataHash: jsonHash(row),
          createdAt: importedAt,
          updatedAt: importedAt,
        };
      });

      if (duplicates.size > 0) {
        errors.push(
          `Store '${storeName}' has duplicate record keys: ${Array.from(duplicates)
            .slice(0, 5)
            .join(', ')}`
        );
      }

      storePlans.push({
        storeName,
        brandId,
        scope: isShared ? 'SHARED' : 'BRAND',
        rawCount: rows.length,
        rows: rowsForDb,
      });
    }
  }

  const localStorageEntries = [];
  if (errors.length === 0 && importLocalStorage && isPlainRecord(backup.localStorage)) {
    for (const [key, value] of Object.entries(backup.localStorage)) {
      if (typeof value !== 'string') {
        warnings.push(`localStorage key '${key}' skipped because value is not a string.`);
        continue;
      }
      const category = localStorageCategoryOf(key);
      localStorageEntries.push({
        id: randomUUID(),
        brandId: targetBrandId,
        key,
        value,
        category,
        migrateMode: localStorageMigrateModeOf(category),
        metadata: {
          sourceBackupVersion: text(backup.version) || null,
        },
        createdAt: importedAt,
        updatedAt: importedAt,
      });
    }
  }

  const rowCount = storePlans.reduce((total, store) => total + store.rows.length, 0);
  const skippedStoreCount = Object.keys(backup?.stores || {}).length - storePlans.length;
  const sourceBrandId = sourceBrandIdOf(backup, targetBrandId);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    source: {
      kind: 'backup_json',
      brandId: sourceBrandId,
      brandName: sourceBrandNameOf(backup, sourceBrandId),
      dbName: text(backup?.sourceDbName),
      sharedDbName: text(backup?.sharedDbName),
      version: text(backup?.version),
      exportedAt: text(backup?.exportedAt),
      exportedAtDate: parseDate(backup?.exportedAt),
    },
    target: {
      brandId: targetBrandId,
      includeShared,
      importLocalStorage,
    },
    storePlans,
    localStorageEntries,
    summary: {
      storeCount: storePlans.length,
      skippedStoreCount,
      rowCount,
      localStorageCount: localStorageEntries.length,
      warningCount: warnings.length,
      errorCount: errors.length,
    },
  };
}
