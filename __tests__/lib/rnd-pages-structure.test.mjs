import { readFileSync } from 'fs';
import { resolve } from 'path';

const constantsSource = readFileSync(resolve('lib/db/constants.js'), 'utf8');
const schemaSource = readFileSync(resolve('lib/db/schema/rnd.js'), 'utf8');
const schemaIndexSource = readFileSync(resolve('lib/db/schema/index.js'), 'utf8');
const moduleStoresSource = readFileSync(resolve('lib/db/module-stores.js'), 'utf8');
const storeCatalogSource = readFileSync(resolve('prisma/store-catalog.mjs'), 'utf8');
const menuSource = readFileSync(resolve('lib/menu.js'), 'utf8');
const roleVisibilitySource = readFileSync(resolve('lib/navigation/role-visibility.js'), 'utf8');
const routeClassificationSource = readFileSync(
  resolve('lib/navigation/route-classification.js'),
  'utf8'
);
const corporateStoreSource = readFileSync(resolve('lib/rnd/corporate-card.js'), 'utf8');
const loginStoreSource = readFileSync(resolve('lib/rnd/login-info.js'), 'utf8');
const corporatePageSource = readFileSync(resolve('app/rnd/corporate-card/page.jsx'), 'utf8');
const loginPageSource = readFileSync(resolve('app/rnd/login-info/page.jsx'), 'utf8');

describe('RND 업무 페이지 구조', () => {
  test('RND stores are registered in DB schema and backup groups', () => {
    expect(constantsSource).toContain("'rnd_corporate_card_entries'");
    expect(constantsSource).toContain("'rnd_login_credentials'");
    expect(schemaSource).toContain("createObjectStore('rnd_corporate_card_entries'");
    expect(schemaSource).toContain("createObjectStore('rnd_login_credentials'");
    expect(schemaSource).toContain("s.createIndex('usedAt', 'usedAt')");
    expect(schemaSource).toContain("s.createIndex('isIsp', 'isIsp')");
    expect(schemaIndexSource).toContain('createRndStores(idb)');
    expect(moduleStoresSource).toContain('rnd: {');
    expect(moduleStoresSource).toContain("'rnd_corporate_card_entries'");
    expect(moduleStoresSource).toContain("'rnd_login_credentials'");
    expect(storeCatalogSource).toContain('rnd_corporate_card_entries: {');
    expect(storeCatalogSource).toContain('rnd_login_credentials: {');
  });

  test('RND pages are reachable from navigation and hidden from viewer roles', () => {
    expect(menuSource).toContain("id: 'rnd'");
    expect(menuSource).not.toContain("id: 'rnd-sample-records'");
    expect(menuSource).toContain("href: '/rnd/corporate-card'");
    expect(menuSource).toContain("href: '/rnd/login-info'");
    expect(routeClassificationSource).toContain("route: '/rnd/corporate-card'");
    expect(routeClassificationSource).toContain("route: '/rnd/login-info'");
    expect(roleVisibilitySource).toContain("'/rnd/corporate-card'");
    expect(roleVisibilitySource).toContain("'/rnd/login-info'");
  });

  test('corporate card page imports uploaded spreadsheets and exports the statement workbook', () => {
    expect(corporateStoreSource).toContain("const STORE = 'rnd_corporate_card_entries'");
    expect(corporateStoreSource).toContain('parseCorporateCardRows');
    expect(corporateStoreSource).toContain('importCorporateCardEntries');
    expect(corporateStoreSource).toContain('yearMonth');
    expect(corporateStoreSource).toContain('buildCorporateCardMonthlySummary');
    expect(corporateStoreSource).toContain('matchColumn(headers');
    expect(corporateStoreSource).toContain('bulkPut(STORE, records)');
    expect(corporateStoreSource).toContain('downloadCorporateCardStatement');
    expect(corporateStoreSource).toContain('buildCorporateCardStatementWorkbookData');
    expect(corporateStoreSource).toContain('rowsFromRawRows(rawRows)');
    expect(corporateStoreSource).toContain('법인체크카드 지출경비내역서');
    expect(corporateStoreSource).toContain("'A1:C2'");
    expect(corporateStoreSource).toContain("'합   계'");
    expect(corporateStoreSource).toContain('XLSX.utils.aoa_to_sheet(rows)');
    expect(corporateStoreSource).toContain("makeFileName('법인체크카드_지출경비내역서', 'xlsx')");
    expect(corporatePageSource).toContain('<UploadDropzone');
    expect(corporatePageSource).toContain('await readSpreadsheetFile(file)');
    expect(corporatePageSource).toContain('parseCorporateCardRows(parsed)');
    expect(corporatePageSource).toContain('importCorporateCardEntries(result.entries)');
    expect(corporatePageSource).toContain('downloadCorporateCardStatement(visibleRows)');
    expect(corporatePageSource).toContain('월별 총금액');
    expect(corporatePageSource).toContain('selectedMonth');
    expect(corporatePageSource).toContain('buildCorporateCardMonthlySummary(rows)');
    expect(corporatePageSource).toContain("new Set(['cardName', 'ispMemo'])");
    expect(corporatePageSource).not.toContain('<th>카드번호/카드명</th>');
    expect(corporatePageSource).not.toContain('<th>법인카드 결제 ISP</th>');
    expect(corporatePageSource).toContain('법인카드 엑셀 파일 업로드');
    expect(corporatePageSource).toContain('사용일');
    expect(corporatePageSource).toContain('사용처');
    expect(corporatePageSource).toContain('금액');
  });

  test('login info page stores credentials, ISP text, and opens saved site links', () => {
    expect(loginStoreSource).toContain("const STORE = 'rnd_login_credentials'");
    expect(loginStoreSource).toContain('normalizeUrl');
    expect(loginStoreSource).toContain('credentialSiteHref');
    expect(loginStoreSource).toContain('ispMemo');
    expect(loginPageSource).toContain('saveLoginCredential(form)');
    expect(loginPageSource).toContain('credentialSiteHref(row)');
    expect(loginPageSource).toContain('target="_blank"');
    expect(loginPageSource).toContain('rel="noreferrer"');
    expect(loginPageSource).toContain('copyPassword(row.password)');
    expect(loginPageSource).toContain('법인카드 결제 ISP');
    expect(loginPageSource).not.toContain('type="checkbox"');
    expect(loginPageSource).toContain('showPasswords');
  });
});
