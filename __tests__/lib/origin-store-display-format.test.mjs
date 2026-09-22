import { describe, expect, test } from '@jest/globals';
import {
  formatStoreDisplayItem,
  formatStoreMixedCountry,
  formatStoreOriginCountry,
  stripPizzaWord,
} from '@/lib/nutrition/origin/store-display-format';

// 2026-09-22 주임님이 준 양식(원산지 매장비치용.xlsx) 기준
describe('origin store display format', () => {
  test('표시품목 열: 표시품목들(재료명들)', () => {
    expect(formatStoreDisplayItem(['돼지고기', '쇠고기'], ['페페로니'])).toBe(
      '돼지고기, 쇠고기(페페로니)'
    );
    expect(formatStoreDisplayItem('치즈', ['까망베르', '', '모짜렐라', '까망베르'])).toBe(
      '치즈(까망베르, 모짜렐라)'
    );
    expect(formatStoreDisplayItem('돼지고기', [])).toBe('돼지고기');
  });

  test('원산지 열: 전체를 괄호로 감싸고 항목은 "/"로 잇는다', () => {
    expect(formatStoreOriginCountry([{ label: '돼지고기', country: '국내산' }])).toBe(
      '(돼지고기:국내산)'
    );
    expect(
      formatStoreOriginCountry([
        { label: '돼지고기', country: '국내산' },
        { label: '쇠고기', country: '호주산' },
      ])
    ).toBe('(돼지고기:국내산/쇠고기:호주산)');
    expect(formatStoreOriginCountry([])).toBe('');
  });

  test('쉼표로 여러 나라가 적힌 원산지엔 "섞음"을 붙인다', () => {
    expect(formatStoreMixedCountry('호주산,뉴질랜드산')).toBe('호주산,뉴질랜드산 섞음');
    expect(formatStoreMixedCountry('국내산, 외국산 섞음')).toBe('국내산, 외국산 섞음');
    expect(formatStoreMixedCountry('미국산')).toBe('미국산');
  });

  test('메뉴명의 "피자" 단어를 뺀다', () => {
    expect(stripPizzaWord('샘스테이크 피자')).toBe('샘스테이크');
    expect(stripPizzaWord('페페로니 피자(1인용)')).toBe('페페로니(1인용)');
    expect(stripPizzaWord('피자')).toBe('피자');
  });
});
