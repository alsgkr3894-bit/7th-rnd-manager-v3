/**
 * lib/sales/export-xlsx.js — 메뉴판매량 결과 xlsx 다운로드
 *
 * 두 가지 빌더:
 *   - exportSingleMonthXlsx(period, detail, groupRanking)
 *     · 시트 1: 카테고리별 요약 (비중%)
 *     · 시트 N: 각 카테고리별 메뉴 + 규격 상세
 *   - exportCompareXlsx(periodA, periodB, compare)
 *     · 시트 1: 요약 (총 판매량 + 신규/단종)
 *     · 시트 2-: 카테고리별 비교
 *
 * 'use client' 컴포넌트 안에서만 호출.
 */

let _xlsxPromise = null;
async function loadXlsx() {
  if (!_xlsxPromise) _xlsxPromise = import('xlsx');
  return _xlsxPromise;
}

const SHEET_NAME_LIMIT = 31; // xlsx 시트명 최대 31자

function safeSheetName(name) {
  return String(name).replace(/[\\\/\?\*\[\]:]/g, '_').slice(0, SHEET_NAME_LIMIT);
}

function fmtPeriod(p) {
  return p ? `${p.year}-${String(p.month).padStart(2, '0')}` : '';
}

/** "2026년03월" */
function fmtPeriodKo(p) {
  if (!p) return '';
  return `${p.year}년${String(p.month).padStart(2, '0')}월`;
}

/** 오늘 날짜 — "2026-05-25" */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ============================================================
   단일 월 — 카테고리별 시트로 분리
============================================================ */

/**
 * @param {{year, month}} period
 * @param {{ total, categories: [{ name, value, share, topMenus, color }] }} detail
 * @param {Array<{ name, category, quantity, sizes: [{ size, quantity, share }] }>} groupRanking
 */
export async function exportSingleMonthXlsx(period, detail, groupRanking) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();

  // ── 시트 1: 카테고리별 요약 ─────────────────────────────────
  const summaryRows = [
    ['카테고리', '판매량(개)', '비중(%)'],
    ...detail.categories.map(c => [
      c.name,
      c.value,
      Math.round((c.share ?? 0) * 100) / 100,
    ]),
    [],
    ['전체 합계', detail.total, 100],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, '카테고리 요약');

  // ── 시트 N: 각 카테고리별 중분류 상세 ───────────────────────
  const byCategory = new Map();
  for (const g of groupRanking) {
    if (!byCategory.has(g.category)) byCategory.set(g.category, []);
    byCategory.get(g.category).push(g);
  }

  for (const cat of detail.categories) {
    const groups = byCategory.get(cat.name) || [];
    const sorted = [...groups].sort((a, b) => b.quantity - a.quantity);
    const catTotal = sorted.reduce((s, g) => s + g.quantity, 0);

    const rows = [['순위', '중분류', '판매량(개)', '그룹 내 비중(%)']];

    sorted.forEach((g, idx) => {
      const share = catTotal > 0 ? (g.quantity / catTotal) * 100 : 0;
      rows.push([
        idx + 1,
        g.name,
        g.quantity,
        Math.round(share * 100) / 100,
      ]);
    });

    if (sorted.length > 0) {
      rows.push([]);
      rows.push(['', '합계', catTotal, 100]);
    } else {
      rows.push(['', '데이터 없음', '', '']);
    }

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, sheet, safeSheetName(cat.name));
  }

  XLSX.writeFile(wb, `7번가피자_${fmtPeriodKo(period)}_메뉴판매량_${todayStr()}.xlsx`);
}

/* ============================================================
   두 기간 비교 — 카테고리별 시트
============================================================ */

/**
 * @param {{year, month}} periodA
 * @param {{year, month}} periodB
 * @param {object} compare — buildPeriodCompare 결과
 */
export async function exportCompareXlsx(periodA, periodB, compare) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();

  // 시트 1: 요약
  const summaryRows = [
    ['기간', '판매량(개)'],
    [`기준 (A) ${fmtPeriod(periodA)}`, compare.totalA],
    [`비교 (B) ${fmtPeriod(periodB)}`, compare.totalB],
    ['증감',     compare.totalDiff],
    ['증감률(%)', compare.totalPct == null ? '-' : Math.round(compare.totalPct * 100) / 100],
    [],
    [`신규 출시 메뉴 (${compare.newMenus.length}개)`],
    ['메뉴명', '카테고리', '판매량(A)'],
    ...compare.newMenus.map(m => [m.name, m.category, m.a]),
    [],
    [`단종·중단 메뉴 (${compare.droppedMenus.length}개)`],
    ['메뉴명', '카테고리', '판매량(B)'],
    ...compare.droppedMenus.map(m => [m.name, m.category, m.b]),
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, '요약');

  // 시트 2: 전체 메뉴별 비교 (정렬: 기준A 내림차순)
  const byCategory = new Map();
  for (const r of compare.rows) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category).push(r);
  }

  for (const [cat, rows] of byCategory) {
    const sorted = [...rows].sort((a, b) => b.a - a.a);
    const aoa = [
      ['순위', '메뉴명', `기준A(${fmtPeriod(periodA)})`, `비교B(${fmtPeriod(periodB)})`, '증감', '증감률(%)', '상태'],
      ...sorted.map((r, i) => [
        i + 1,
        r.name,
        r.a > 0 ? r.a : '',
        r.b > 0 ? r.b : '',
        r.diff,
        r.pct == null ? '신규' : Math.round(r.pct * 100) / 100,
        r.bIsZero && !r.aIsZero ? '신규' : r.aIsZero && !r.bIsZero ? '단종' : '비교',
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    sheet['!cols'] = [{ wch: 6 }, { wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, sheet, safeSheetName(cat || '미분류'));
  }

  XLSX.writeFile(wb, `7번가피자_${fmtPeriodKo(periodA)}vs${fmtPeriodKo(periodB)}_메뉴판매량비교_${todayStr()}.xlsx`);
}
