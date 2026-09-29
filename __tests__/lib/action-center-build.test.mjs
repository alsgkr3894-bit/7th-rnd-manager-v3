import { describe, expect, test } from '@jest/globals';
import {
  buildAllActions,
  buildBackupActions,
  buildCostAlertActions,
  buildNoPriceActions,
  buildUnmatchedActions,
} from '@/lib/action-center/build';

describe('action center action identity', () => {
  test('단가 없음 action id는 누락 수가 바뀌면 달라진다', () => {
    const [one] = buildNoPriceActions({ noPriceCount: 1 });
    const [two] = buildNoPriceActions({ noPriceCount: 2 });

    expect(one.id).toBe('ingredient-no-price__1');
    expect(two.id).toBe('ingredient-no-price__2');
    expect(one.id).not.toBe(two.id);
  });

  test('백업 권장 action id는 never와 경과일 상태를 구분한다', () => {
    const [never] = buildBackupActions({ backupReminder: { never: true } });
    const [stale] = buildBackupActions({
      backupReminder: { stale: true, never: false, daysSince: 8 },
    });

    expect(never.id).toBe('backup-recommended__never');
    expect(stale.id).toBe('backup-recommended__days-8');
    expect(never.id).not.toBe(stale.id);
  });

  test('원가율 경보와 미매칭 action도 원인 규모가 id에 반영된다', () => {
    const [unmatched] = buildUnmatchedActions({ unmatchedCount: 3 });
    // getCostAlertData()의 실제 반환 모양: { items: [{ costRate, ... }], total }
    const [costAlert] = buildCostAlertActions({
      costAlertData: {
        items: [{ costRate: 41 }, { costRate: 37 }, { costRate: 36 }, { costRate: 20 }],
        total: 4,
      },
      riskThreshold: 35,
    });

    expect(unmatched.id).toBe('unmatched-menu__3');
    expect(costAlert.id).toBe('cost-alert__3__35');
  });

  test('판매량 업로드 필요 action은 viewer에게 숨긴다', () => {
    const uploadFreshness = { sales: { stale: true, never: true } };
    const adminItems = buildAllActions({ uploadFreshness, canEdit: true });
    const viewerItems = buildAllActions({ uploadFreshness, canEdit: false });

    expect(adminItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: '/menu-sales/upload', requiresEdit: true }),
      ])
    );
    expect(viewerItems.map(item => item.href)).not.toContain('/menu-sales/upload');
  });
});

/**
 * 회귀 방지(2026-09-29): 홈 액션센터의 원가율 경보 카드가 한 번도 안 떴다.
 * buildCostAlertActions가 존재하지 않는 costAlertData.alertMenus를 읽었고, 실제
 * getCostAlertData() 반환은 { items, total }이다. 기존 테스트도 alertMenus를 넣어 통과해 왔다.
 */
describe('buildCostAlertActions — 실제 반환 모양 { items, total }', () => {
  const data = {
    items: [{ costRate: 55 }, { costRate: 41 }, { costRate: 40 }, { costRate: 22 }],
    total: 4,
  };

  test('기준을 초과한 메뉴 수로 카드를 만든다 (경계값 40은 초과가 아니다)', () => {
    const [card] = buildCostAlertActions({ costAlertData: data, riskThreshold: 40 });
    expect(card.title).toBe('원가율 경보 메뉴 2개');
    expect(card.href).toBe('/cost/margin');
  });

  test('기준을 낮추면 카드의 메뉴 수가 따라간다 — 홈 경보 위젯과 같은 설정을 쓴다', () => {
    expect(buildCostAlertActions({ costAlertData: data, riskThreshold: 30 })[0].title).toBe(
      '원가율 경보 메뉴 3개'
    );
  });

  test('경보 메뉴가 없거나 데이터가 없으면 카드를 만들지 않는다', () => {
    expect(buildCostAlertActions({ costAlertData: data, riskThreshold: 60 })).toEqual([]);
    expect(buildCostAlertActions({ costAlertData: null })).toEqual([]);
    expect(buildCostAlertActions({ costAlertData: { items: [] } })).toEqual([]);
  });

  test('기준을 안 넘기면 설정 기본값(40)을 쓴다', () => {
    expect(buildCostAlertActions({ costAlertData: data })).toHaveLength(1);
  });

  test('buildAllActions가 기준을 그대로 전달해 홈에서 카드가 실제로 나온다', () => {
    const items = buildAllActions({ costAlertData: data, riskThreshold: 40, canEdit: true });
    expect(items.some(item => item.source === 'cost')).toBe(true);
  });
});
