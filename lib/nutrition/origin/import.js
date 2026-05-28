/**
 * lib/nutrition/origin/import.js
 * 원산지 B타입 엑셀 → nutrition_origin_master DB 임포트
 *
 * 파싱 대상: 냉장고부착용 시트 (가장 명확한 구조)
 *   A열: 음식명 (ingredientName / menuName)
 *   B열: 표시품목
 *   C열: 원산지 — "표시품목:원산지" 형식, "/" 구분자로 복수 가능
 *
 * 기존 DB 데이터는 건드리지 않음 (upsert: ingredientName 기준)
 */
import * as XLSX from 'xlsx';
import { upsertOrigin } from './store';

/**
 * "돼지고기:국내산/쇠고기:호주산" → [{displayName:'돼지고기', originCountry:'국내산'}, ...]
 */
function parseOriginCell(cell) {
  if (!cell) return [];
  return cell
    .split('/')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const idx = s.indexOf(':');
      if (idx < 0) return { displayName: s, originCountry: '' };
      return {
        displayName:   s.slice(0, idx).trim(),
        originCountry: s.slice(idx + 1).trim(),
      };
    });
}

/**
 * 엑셀 파일(ArrayBuffer 또는 fetch URL) → origin 레코드 배열 반환
 * @param {ArrayBuffer} buf
 */
function parseExcelToOrigins(buf) {
  const wb = XLSX.read(buf, { type: 'array' });

  // 냉장고부착용 시트 (3번째)
  const sheetName = wb.SheetNames[2];
  if (!sheetName) throw new Error('냉장고부착용 시트를 찾을 수 없습니다');
  const ws = wb.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const origins = [];
  // 행2(index=1)가 헤더, 행3(index=2)부터 데이터
  for (let i = 2; i < rows.length; i++) {
    const [foodName, displayItemRaw, originRaw] = rows[i];
    const name = String(foodName || '').trim();

    // 빈 행 · 주의문구 행 건너뜀
    if (!name || name.startsWith('※')) continue;

    const items = parseOriginCell(String(originRaw || ''));

    // B열 표시품목이 C열 파싱과 다를 경우 보정
    // (B열이 더 정확한 displayName 목록일 수 있으므로 우선 C열 파싱 사용)
    if (!items.length) {
      // C열 파싱 실패 시 B열로 대체
      const bItems = String(displayItemRaw || '').split(',').map(s => s.trim()).filter(Boolean);
      bItems.forEach(d => items.push({ displayName: d, originCountry: '' }));
    }

    origins.push({
      ingredientName: name,
      menuName:       name,   // 음식명 = 식재료명으로 사용
      displayName:    items[0]?.displayName || '',
      originCountry:  items[0]?.originCountry || '',
      originRegion:   '',
      items,
      note:           '',
    });
  }

  return origins;
}

/**
 * /public/templates/원산지_템플릿.xlsx 를 fetch해서 DB에 임포트
 * @returns {{ imported: number, skipped: number }}
 */
export async function importOriginFromTemplate() {
  const res = await fetch('/templates/원산지_템플릿.xlsx');
  if (!res.ok) throw new Error('템플릿 파일을 불러올 수 없습니다 (/public/templates/원산지_템플릿.xlsx)');
  const buf = await res.arrayBuffer();
  const origins = parseExcelToOrigins(buf);

  if (!origins.length) throw new Error('파싱된 데이터가 없습니다');

  let imported = 0;
  let skipped  = 0;
  for (const o of origins) {
    try {
      await upsertOrigin({
        ingredientId:   null,
        productCode:    null,
        ingredientName: o.ingredientName,
        menuName:       o.menuName,
        displayName:    o.displayName,
        originCountry:  o.originCountry,
        originRegion:   o.originRegion,
        items:          o.items,
        note:           o.note,
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  return { imported, skipped, total: origins.length };
}

/**
 * 사용자가 직접 선택한 File 객체에서 임포트
 * @param {File} file
 */
export async function importOriginFromFile(file) {
  const buf = await file.arrayBuffer();
  const origins = parseExcelToOrigins(buf);

  if (!origins.length) throw new Error('파싱된 데이터가 없습니다');

  let imported = 0, skipped = 0;
  for (const o of origins) {
    try {
      await upsertOrigin({
        ingredientId:   null,
        productCode:    null,
        ingredientName: o.ingredientName,
        menuName:       o.menuName,
        displayName:    o.displayName,
        originCountry:  o.originCountry,
        originRegion:   o.originRegion,
        items:          o.items,
        note:           o.note,
      });
      imported++;
    } catch { skipped++; }
  }

  return { imported, skipped, total: origins.length };
}
