import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/note/market/page.jsx'), 'utf8');
const storeSource = readFileSync(resolve('lib/note/market-research.js'), 'utf8');
const constantsSource = readFileSync(resolve('lib/db/constants.js'), 'utf8');
const noteSchemaSource = readFileSync(resolve('lib/db/schema/note.js'), 'utf8');
const moduleStoresSource = readFileSync(resolve('lib/db/module-stores.js'), 'utf8');
const menuSource = readFileSync(resolve('lib/menu.js'), 'utf8');

describe('market research note page structure', () => {
  test('market research page is reachable from note navigation and persists in its own store', () => {
    expect(menuSource).toContain("{ id: 'note-market', label: '시장조사', href: '/note/market' }");
    expect(constantsSource).toContain('export const DB_VERSION = 24');
    expect(constantsSource).toContain("'market_research'");
    expect(noteSchemaSource).toContain("idb.objectStoreNames.contains('market_research')");
    expect(noteSchemaSource).toContain("s.createIndex('date', 'date')");
    expect(noteSchemaSource).toContain("s.createIndex('type', 'type')");
    expect(moduleStoresSource).toContain("'market_research'");
  });

  test('market research page supports trend, competitor, and brand reference records', () => {
    expect(storeSource).toContain('export const MARKET_RESEARCH_TYPES');
    expect(storeSource).toContain('시장분석');
    expect(storeSource).toContain('올해트렌드');
    expect(storeSource).toContain('타브랜드참고');
    expect(storeSource).toContain('개발포인트');
    expect(storeSource).toContain('export async function getAllMarketResearch');
    expect(storeSource).toContain('export async function saveMarketResearch');
    expect(storeSource).toContain('export async function deleteMarketResearch');
    expect(pageSource).toContain("breadcrumb={['메뉴개발노트', '시장조사']}");
    expect(pageSource).toContain('경쟁사 / 시장 키워드');
    expect(pageSource).toContain('시장분석 / 올해 트렌드 방향성');
    expect(pageSource).toContain('타브랜드 참고 포인트');
    expect(pageSource).toContain('개발 방향 / 적용 아이디어');
    expect(pageSource).toContain('useCallback(async () =>');
    expect(pageSource).toContain('await saveMarketResearch(form)');
  });
});
