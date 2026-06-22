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
    const [costAlert] = buildCostAlertActions({
      costAlertData: { threshold: 35, alertMenus: [{ menuCode: 'A' }, { menuCode: 'B' }] },
    });

    expect(unmatched.id).toBe('unmatched-menu__3');
    expect(costAlert.id).toBe('cost-alert__2__35');
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
