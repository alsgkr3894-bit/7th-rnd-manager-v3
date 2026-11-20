import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = path => readFileSync(resolve(path), 'utf8');

describe('메뉴마스터 구성품 전용 연결', () => {
  test('편집 화면과 저장 레코드에 componentOnly가 연결된다', () => {
    expect(readSource('components/menu-master/MenuMasterEditFields.jsx')).toContain(
      '<ComponentOnlyField'
    );
    expect(readSource('components/menu-master/MenuMasterEditModal.jsx')).toContain(
      'componentOnly: form.componentOnly'
    );
    expect(readSource('lib/menu-master/store.js')).toContain(
      'rec.componentOnly = data.componentOnly === true'
    );
  });

  test('품질 점검과 출시 준비에서 판매가·원가율을 비대상 처리한다', () => {
    expect(readSource('lib/menu-master/data-quality.js')).toContain(
      'if (menu?.componentOnly === true) return false'
    );
    const readiness = readSource('lib/menu-master/readiness.js');
    expect(readiness).toContain("구성품 전용 — 판매가 비대상");
    expect(readiness).toContain("구성품 전용 — 원가율 비대상");
  });
});
