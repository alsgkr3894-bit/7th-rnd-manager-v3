import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { detectHeaderColumns } from '../../lib/sales/parse-header.js';
import { validateSalesFile } from '../../lib/sales/parse.js';
import { canFillRevenue, planRevenueFill } from '../../lib/sales/fill-revenue.js';

// 2026-10-01: POS 엑셀의 금액 칸이 '매출액 (원)'이라 인식을 못 해서 매출액이 전부 0으로 저장돼 왔다.
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const POS_HEADER = ['카테고리', '메뉴 명', '판매량 (개)', '매출액 (원)', '매출 비중'];

describe('금액 칸 인식', () => {
  const revenueIndex = header =>
    detectHeaderColumns(['메뉴명', '판매량(개)', header]).revenueColumnIndex;

  test('단위 (원)이 붙은 금액 칸도 알아본다', () => {
    expect(revenueIndex('매출액 (원)')).toBe(2);
    expect(revenueIndex('매출액(원)')).toBe(2);
    expect(revenueIndex('판매금액(원)')).toBe(2);
    expect(revenueIndex('매출액')).toBe(2);
  });

  test('비중·천원 단위 칸은 금액으로 보지 않는다', () => {
    expect(revenueIndex('매출 비중')).toBe(-1);
    expect(revenueIndex('매출액 (천원)')).toBe(-1);
  });

  test('실제 POS 헤더에서 매출액 (원) 칸을 고른다', () => {
    const result = detectHeaderColumns(POS_HEADER);
    expect(result.success).toBe(true);
    expect(result.revenueColumnIndex).toBe(3);
    expect(result.revenueColumnName).toBe('매출액 (원)');
  });

  test('실제 POS 파일 형태 그대로 매출액이 읽힌다', () => {
    const result = validateSalesFile([
      ['7번가피자_종합분석_메뉴분석_메뉴별 판매량', '', '', '', ''],
      [' 현재기간: 2026-08-01 ~ 2026-08-31', '', '', '', ''],
      ['', '', '', '', ''],
      POS_HEADER,
      ['세트 피자', '하프앤하프 피자(L)', 25563, 749508610, 21.81],
      ['오리지널 피자', '슈퍼콤비네이션 피자(L)', 10814, 301079340, 8.76],
    ]);
    expect(result.success).toBe(true);
    expect(result.revenueSummary.hasRevenueColumn).toBe(true);
    expect(result.revenueSummary.totalRevenue).toBe(749508610 + 301079340);
  });
});

describe('매출액만 채우기 계획', () => {
  // 예전 업로드는 행 번호가 2부터, 지금 파서는 5부터 — 순서로만 맞춘다
  const stored = [
    { id: 11, rawMenuName: '하프앤하프 피자(L)', quantity: 25563, revenue: 0, originalIndex: 2 },
    {
      id: 12,
      rawMenuName: '슈퍼콤비네이션 피자(L)',
      quantity: 10814,
      revenue: 0,
      originalIndex: 3,
    },
    {
      id: 13,
      rawMenuName: '케이준 치킨텐더 5PCS + 콘코울슬로',
      quantity: 40,
      revenue: 0,
      originalIndex: 4,
    },
    {
      id: 14,
      rawMenuName: '케이준 치킨텐더 5PCS + 콘코울슬로',
      mappedMenuName: '콘코울슬로',
      quantity: 40,
      revenue: 0,
      originalIndex: 4,
      isCombo: true,
    },
  ];
  const incoming = [
    { rawMenuName: '하프앤하프 피자(L)', quantity: 25563, revenue: 749508610, originalIndex: 5 },
    {
      rawMenuName: '슈퍼콤비네이션 피자(L)',
      quantity: 10814,
      revenue: 301079340,
      originalIndex: 6,
    },
    {
      rawMenuName: '케이준 치킨텐더 5PCS + 콘코울슬로',
      quantity: 40,
      revenue: 600000,
      originalIndex: 7,
    },
  ];

  test('메뉴명·수량이 순서대로 같으면 원본 행에만 금액을 채운다(콤보 가상 행은 0 그대로)', () => {
    const plan = planRevenueFill(stored, incoming);
    expect(plan.ok).toBe(true);
    expect(plan.updates).toEqual([
      { id: 11, revenue: 749508610 },
      { id: 12, revenue: 301079340 },
      { id: 13, revenue: 600000 },
    ]);
    expect(plan.totalRevenue).toBe(749508610 + 301079340 + 600000);
  });

  test('수량이 하나라도 다르면 채우지 않는다', () => {
    const changed = incoming.map((row, i) => (i === 1 ? { ...row, quantity: 10815 } : row));
    const plan = planRevenueFill(stored, changed);
    expect(plan.ok).toBe(false);
    expect(plan.mismatchCount).toBe(1);
    expect(plan.mismatches[0]).toMatchObject({ storedQuantity: 10814, fileQuantity: 10815 });
  });

  test('메뉴명이 다르거나 행 수가 다르면 채우지 않는다', () => {
    const renamed = incoming.map((row, i) =>
      i === 0 ? { ...row, rawMenuName: '다른 피자' } : row
    );
    expect(planRevenueFill(stored, renamed).ok).toBe(false);
    const short = planRevenueFill(stored, incoming.slice(0, 2));
    expect(short.ok).toBe(false);
    expect(short.reason).toContain('행 수');
  });

  test('매출액이 비어 있던 달에 금액 칸이 있는 파일을 올릴 때만 채우기를 제안한다', () => {
    const withRevenue = { hasRevenueColumn: true };
    expect(canFillRevenue({ hasRevenueColumn: false, totalRevenue: 0 }, withRevenue)).toBe(true);
    expect(canFillRevenue({ totalRevenue: undefined }, withRevenue)).toBe(true);
    expect(canFillRevenue({ hasRevenueColumn: true, totalRevenue: 5 }, withRevenue)).toBe(false);
    expect(canFillRevenue({ hasRevenueColumn: false, totalRevenue: 0 }, {})).toBe(false);
    expect(canFillRevenue(null, withRevenue)).toBe(false);
  });
});

describe('매출액 채우기 저장', () => {
  test('관리자만, 한 트랜잭션에서 revenue와 파일 메타만 바꾼다', () => {
    const src = read('lib/sales/store-files.js');
    const body = src.slice(src.indexOf('export async function fillFileRevenue'));
    expect(body).toContain("assertActiveAdmin('판매량 매출액 채우기')");
    expect(body).toContain("runTransaction(['sales_files', 'sales_rows'], 'readwrite'");
    expect(body).toContain('rowStore.put({ ...row, revenue');
    expect(body).toContain('hasRevenueColumn: true');
  });

  test('업로드 화면은 이미 있는 달이라도 채우기 미리보기로 이어진다', () => {
    const hook = read('lib/sales/use-sales-upload.js');
    expect(hook).toContain('canFillRevenue(');
    expect(hook).toContain('planRevenueFill(');
    expect(hook).toContain("setStage('fill-preview')");
    expect(read('app/menu-sales/upload/page.jsx')).toContain('<RevenueFillPreview');
  });
});
