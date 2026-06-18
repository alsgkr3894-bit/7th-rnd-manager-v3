import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const settingsPageSource = readFileSync(resolve('app/jette/settings/page.jsx'), 'utf8');
const pricePageSource = readFileSync(resolve('app/jette/price-compare/page.jsx'), 'utf8');
const priceHookSource = readFileSync(resolve('lib/price/use-price-upload.js'), 'utf8');
const compareTableSource = readFileSync(resolve('components/jette/PriceCompareTable.jsx'), 'utf8');
const compareRowSource = readFileSync(
  resolve('components/jette/price-compare/PriceCompareRow.jsx'),
  'utf8'
);
const summaryCardsSource = readFileSync(resolve('components/jette/PriceSummaryCards.jsx'), 'utf8');

describe('jette settings usage guards', () => {
  test('제때 설정 화면은 공통 설정 정규화 기준을 사용한다', () => {
    expect(settingsPageSource).toContain('JETTE_SETTINGS_KEY');
    expect(settingsPageSource).toContain('normalizeJetteSettings');
    expect(settingsPageSource).toContain('normalizePriceAlertThreshold');
    expect(settingsPageSource).toContain('항상 자동 반영');
  });

  test('가격 임계값 설정은 요약 카드와 비교 테이블에 전달된다', () => {
    expect(pricePageSource).toContain('jetteSettings');
    expect(pricePageSource).toContain('priceAlertThreshold={jetteSettings.priceAlertThreshold}');
    expect(compareTableSource).toContain('priceAlertThreshold');
    expect(compareRowSource).toContain('isPriceChangeAlert');
    expect(summaryCardsSource).toContain('isPriceChangeAlert');
  });

  test('신규 제품 등록 방식은 단가 업로드 후 자동등록 후보 생성에 연결된다', () => {
    expect(priceHookSource).toContain('buildAutoRegisterCandidates');
    expect(priceHookSource).toContain("autoRegisterNew !== 'auto'");
    expect(priceHookSource).toContain('addManagedProduct(candidate)');
  });
});
