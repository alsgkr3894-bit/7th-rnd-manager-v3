import { parseMenuPriceRows } from '../../lib/cost/menu-price/parse.js';

describe('parseMenuPriceRows', () => {
  test('비정상 headers 입력은 구조화된 실패 결과를 반환', () => {
    const result = parseMenuPriceRows(null, [{ 메뉴명: '테스트', 판매가: '1000' }]);

    expect(result.ok).toBe(false);
    expect(result.success).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(result.error).toContain('필수 컬럼 누락');
  });

  test('비정상 rows 입력은 빈 성공 결과를 반환', () => {
    const result = parseMenuPriceRows(['메뉴명', '판매가'], null);

    expect(result).toEqual({ ok: true, success: [], failed: [] });
  });

  test('정상 행은 기존 형식대로 성공 목록에 담는다', () => {
    const result = parseMenuPriceRows(
      ['메뉴명', '판매가', '분류', '규격'],
      [{ 메뉴명: '슈퍼콤비네이션', 판매가: '26,900원', 분류: '피자/오리지널', 규격: 'L' }],
    );

    expect(result.ok).toBe(true);
    expect(result.failed).toEqual([]);
    expect(result.success[0]).toMatchObject({
      menuName: '슈퍼콤비네이션',
      price: 26900,
      category: '피자/오리지널',
      size: 'L',
    });
  });
});
