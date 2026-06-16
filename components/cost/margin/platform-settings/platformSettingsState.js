import { DEFAULT_PLATFORMS, normalizePlatforms } from '@/lib/cost/margin/platforms';

let uidSeq = 0;

export function makePlatformSettingId(prefix, existingIds = []) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;

  const used = new Set(existingIds.map(String));
  let id = '';
  do {
    uidSeq += 1;
    id = `${prefix}-${uidSeq.toString(36)}`;
  } while (used.has(id));
  return id;
}

export function collectPlatformSettingIds(platforms) {
  const ids = [];
  for (const platform of platforms || []) {
    if (platform?.id) ids.push(platform.id);
    for (const fee of Array.isArray(platform?.fees) ? platform.fees : []) {
      if (fee?.id) ids.push(fee.id);
    }
  }
  return ids;
}

export const blankPlatformFee = existingIds => ({
  id: makePlatformSettingId('fee', existingIds),
  label: '',
  type: 'fixed',
  value: '',
  sizeOverrides: {},
});

export function clonePlatformSettings(platforms) {
  const safePlatforms = normalizePlatforms(platforms) || DEFAULT_PLATFORMS;
  return safePlatforms.map(platform => ({
    ...platform,
    fees: (Array.isArray(platform.fees) ? platform.fees : []).map(fee => {
      const next = { ...fee };
      if (fee.sizeOverrides && typeof fee.sizeOverrides === 'object') {
        next.sizeOverrides = { ...fee.sizeOverrides };
      }
      return next;
    }),
  }));
}

export function initPlatformSettingsState(platforms) {
  const plats = clonePlatformSettings(platforms);
  return { plats, selId: plats[0]?.id ?? 'default' };
}

export function platformSettingsReducer(state, action) {
  const { plats, selId } = state;
  switch (action.type) {
    case 'SET_SEL':
      return { ...state, selId: action.id };
    case 'ADD_PLATFORM': {
      const platform = {
        id: makePlatformSettingId('platform', collectPlatformSettingIds(plats)),
        name: '새 플랫폼',
        fees: [],
      };
      return { ...state, plats: [...plats, platform], selId: platform.id };
    }
    case 'DELETE_PLATFORM': {
      if (action.id === 'default') return state;
      const next = plats.filter(platform => platform.id !== action.id);
      return { plats: next, selId: selId === action.id ? (next[0]?.id ?? 'default') : selId };
    }
    case 'SET_PLAT_NAME':
      return {
        ...state,
        plats: plats.map(platform =>
          platform.id === selId ? { ...platform, name: action.name } : platform
        ),
      };
    case 'ADD_FEE':
      return {
        ...state,
        plats: plats.map(platform =>
          platform.id === selId
            ? {
                ...platform,
                fees: [
                  ...(Array.isArray(platform.fees) ? platform.fees : []),
                  blankPlatformFee(collectPlatformSettingIds(plats)),
                ],
              }
            : platform
        ),
      };
    case 'DELETE_FEE':
      return {
        ...state,
        plats: plats.map(platform =>
          platform.id === selId
            ? {
                ...platform,
                fees: (Array.isArray(platform.fees) ? platform.fees : []).filter(
                  fee => fee.id !== action.id
                ),
              }
            : platform
        ),
      };
    case 'PATCH_FEE':
      return {
        ...state,
        plats: plats.map(platform =>
          platform.id === selId
            ? {
                ...platform,
                fees: (Array.isArray(platform.fees) ? platform.fees : []).map(fee =>
                  fee.id === action.id ? { ...fee, ...action.patch } : fee
                ),
              }
            : platform
        ),
      };
    case 'PATCH_SIZE_OVERRIDE':
      return {
        ...state,
        plats: plats.map(platform =>
          platform.id === selId
            ? {
                ...platform,
                fees: (Array.isArray(platform.fees) ? platform.fees : []).map(fee =>
                  fee.id === action.id
                    ? {
                        ...fee,
                        sizeOverrides: { ...(fee.sizeOverrides || {}), [action.key]: action.val },
                      }
                    : fee
                ),
              }
            : platform
        ),
      };
    default:
      return state;
  }
}

export function cleanPlatformsForSave(platforms) {
  return (Array.isArray(platforms) ? platforms : []).map(platform => ({
    ...platform,
    name: (platform.name || '').trim() || '플랫폼',
    fees: (Array.isArray(platform.fees) ? platform.fees : [])
      .filter(fee => {
        const hasLabel = (fee.label ?? '').trim().length > 0;
        const hasValue =
          parseFloat(fee.value) > 0 ||
          parseFloat(fee.sizeOverrides?.L) > 0 ||
          parseFloat(fee.sizeOverrides?.R) > 0;
        return hasLabel || hasValue;
      })
      .map(fee => {
        const out = {
          id: fee.id,
          label: (fee.label ?? '').trim() || '항목',
          type: fee.type,
          value: parseFloat(fee.value) || 0,
        };

        if (fee.type === 'fixed') {
          const sizeOverrides = {};
          const lValue = parseFloat(fee.sizeOverrides?.L);
          const rValue = parseFloat(fee.sizeOverrides?.R);
          if (!isNaN(lValue) && lValue > 0) sizeOverrides.L = lValue;
          if (!isNaN(rValue) && rValue > 0) sizeOverrides.R = rValue;
          if (Object.keys(sizeOverrides).length) out.sizeOverrides = sizeOverrides;
        }

        return out;
      }),
  }));
}
