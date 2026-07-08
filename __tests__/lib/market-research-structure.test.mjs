import { readFileSync } from 'fs';
import { resolve } from 'path';

const pageSource = readFileSync(resolve('app/note/market/page.jsx'), 'utf8');
const storeSource = readFileSync(resolve('lib/note/market-research.js'), 'utf8');
const constantsSource = readFileSync(resolve('lib/db/constants.js'), 'utf8');
const noteSchemaSource = readFileSync(resolve('lib/db/schema/note.js'), 'utf8');
const moduleStoresSource = readFileSync(resolve('lib/db/module-stores.js'), 'utf8');
const storeCatalogSource = readFileSync(resolve('prisma/store-catalog.mjs'), 'utf8');
const menuSource = readFileSync(resolve('lib/menu.js'), 'utf8');

describe('market research note page structure', () => {
  test('market research page is reachable from RND navigation and persists in its own store', () => {
    expect(menuSource).toContain("{ id: 'rnd-market', label: '시장조사', href: '/note/market' }");
    expect(menuSource).not.toContain(
      "{ id: 'note-market', label: '시장조사', href: '/note/market' }"
    );
    expect(constantsSource).toContain("'market_research'");
    expect(noteSchemaSource).toContain("idb.objectStoreNames.contains('market_research')");
    expect(noteSchemaSource).toContain("s.createIndex('date', 'date')");
    expect(noteSchemaSource).toContain("s.createIndex('type', 'type')");
    expect(moduleStoresSource).toContain("'market_research'");
    expect(storeCatalogSource).toContain('market_research: {');
  });

  test('market research records support trend fields and attached photos', () => {
    expect(storeSource).toContain('export const MARKET_RESEARCH_TYPES');
    expect(storeSource).toContain('시장분석');
    expect(storeSource).toContain('올해트렌드');
    expect(storeSource).toContain('타브랜드참고');
    expect(storeSource).toContain('개발포인트');
    expect(storeSource).toContain('photos: asObjectArray(data.photos)');
    expect(storeSource).toContain('export async function getAllMarketResearch');
    expect(storeSource).toContain('export async function saveMarketResearch');
    expect(storeSource).toContain('export async function deleteMarketResearch');
  });

  test('market research page opens on the list and writes from the list action', () => {
    expect(pageSource).toContain("breadcrumb={['RND', '시장조사']}");
    expect(pageSource).toContain('const [writing, setWriting] = useState(false)');
    expect(pageSource).toContain('시장조사 목록');
    expect(pageSource).toContain('작성하기');
    expect(pageSource).toContain('startWrite(row)');
    expect(pageSource).toContain('<NotePhotoSection');
    expect(pageSource).toContain("onChange={value => update('photos', value)}");
    expect(pageSource).toContain('await saveMarketResearch(form)');
  });
});
