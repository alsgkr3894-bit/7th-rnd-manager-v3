import { describe, expect, test } from '@jest/globals';
import {
  formatStoreDisplayItem,
  formatStoreOriginCountry,
} from '@/lib/nutrition/origin/store-display-format';

describe('origin store display format', () => {
  test('매장비치용 표시품목에 식자재명을 괄호로 붙인다', () => {
    expect(formatStoreDisplayItem('돼지고기', ['페퍼로니', '베이컨'])).toBe(
      '돼지고기(페퍼로니, 베이컨)'
    );
  });

  test('매장비치용 표시품목 식자재명은 빈 값과 중복을 제거한다', () => {
    expect(formatStoreDisplayItem('돼지고기', ['페퍼로니', '', '페퍼로니'])).toBe(
      '돼지고기(페퍼로니)'
    );
  });

  test('매장비치용 원산지는 표시품목과 원산지를 함께 보여준다', () => {
    expect(formatStoreOriginCountry('돼지고기', '국내산')).toBe('돼지고기(국내산)');
  });
});
