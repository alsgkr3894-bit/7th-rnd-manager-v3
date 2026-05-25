/**
 * lib/sales/classifier-db.js — DB 룰 우선 분류기
 *
 * 사용자가 미매칭 해결 / 설정에서 추가한 룰을 정적 룰보다 우선 적용.
 *
 * - mapAlias(name):    ref_sales_aliases (enable=true) 우선, 없으면 정적 mapAlias
 * - matchRule(name):   sales_rules (enable=true) 우선, 없으면 정적 matchRule
 * - isExcluded(name):  ref_excluded 에 있으면 true
 *
 * 호출:
 *   const classifier = await buildClassifierFromDB();
 *   classifyAndPrepare(validRows, year, month, classifier);
 */

import { getAll, hasStore } from '../db';
import { mapAlias as mapAliasStatic } from './alias.js';
import { matchRule as matchRuleStatic } from './rule-matcher.js';

/**
 * DB 룰을 캐시한 classifier 빌드.
 * 빈 DB / store 누락 시 정적 룰만 사용.
 */
export async function buildClassifierFromDB() {
  const aliases   = await safeAll('ref_sales_aliases');
  const rules     = await safeAll('sales_rules');
  const excluded  = await safeAll('ref_excluded');

  const aliasMap = new Map();
  for (const a of aliases) {
    if (a.enable === false) continue;
    if (a.rawName) aliasMap.set(a.rawName, a.mappedName);
  }

  // 정확매칭 우선, 그 다음 정규식
  const exactRules = [];
  const patternRules = [];
  for (const r of rules) {
    if (r.enable === false) continue;
    if (r.matchType === 'exact') exactRules.push(r);
    else if (r.matchType === 'pattern' && r.pattern instanceof RegExp) patternRules.push(r);
  }

  const excludedSet = new Set();
  for (const e of excluded) {
    if (e.menuName) excludedSet.add(e.menuName);
  }

  return {
    mapAlias(name) {
      if (aliasMap.has(name)) return aliasMap.get(name);
      return mapAliasStatic(name);
    },
    matchRule(name) {
      if (!name || typeof name !== 'string') return null;
      // DB 정확매칭
      for (const r of exactRules) {
        if (r.pattern === name) return r;
      }
      // DB 정규식
      for (const r of patternRules) {
        if (r.pattern.test(name)) return r;
      }
      // 정적 룰 fallback
      return matchRuleStatic(name);
    },
    isExcluded(name) {
      return excludedSet.has(name);
    },
  };
}

async function safeAll(storeName) {
  if (!hasStore(storeName)) return [];
  try { return await getAll(storeName); } catch { return []; }
}
