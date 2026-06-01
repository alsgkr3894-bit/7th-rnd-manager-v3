/**
 * lib/sales/reclassify.js — 규칙/별칭/제외 변경 후 기존 업로드 데이터 재분류
 *
 * 분류 결과(category/groupName/detailName/status)는 업로드 시점에 sales_rows에
 * 고정 저장된다. 사용자가 설정에서 규칙을 수정해도 이미 저장된 행은 그대로라
 * 보고서·통계에 반영되지 않는다(= 파일을 지우고 재업로드해야만 적용됐다).
 *
 * 이 함수는 저장된 원본(rawMenuName/quantity/originalIndex)을 다시 분류 파이프라인에
 * 통과시켜 각 파일의 sales_rows / menu_sales_issues를 새 결과로 교체한다.
 * 파일 재선택 없이 "삭제 후 재업로드"와 동일한 결과를 만든다.
 */

import { getAll, getByIndex, hasStore } from '../db';
import { buildClassifierFromDB } from './classifier-db.js';
import { classifyAndPrepare } from './classify.js';
import { replaceFileClassification } from './store-files.js';

/**
 * 콤보 분할(classify.js)로 만들어진 가상 행 판별.
 * 원본 재구성 시 제외해야 중복이 생기지 않는다. (재분류가 콤보 행을 다시 생성한다.)
 * 신규 데이터는 isCombo 플래그로, 구 데이터는 휴리스틱으로 판별한다.
 */
function isComboVirtualRow(row) {
  if (row?.isCombo === true) return true;
  if (row?.mappedMenuName !== '콘코울슬로') return false;
  const raw = typeof row.rawMenuName === 'string' ? row.rawMenuName.replace(/\s*\+\s*/g, '+') : '';
  return raw.includes('+콘코울슬로') && row.rawMenuName !== '콘코울슬로';
}

/**
 * 모든 업로드 파일을 현재 DB 규칙 기준으로 재분류.
 * @returns {Promise<{ files: number, rows: number }>}
 */
export async function reclassifyAllFiles() {
  if (!hasStore('sales_rows') || !hasStore('sales_files')) return { files: 0, rows: 0 };

  const classifier = await buildClassifierFromDB();
  const files = await getAll('sales_files');

  let touchedFiles = 0;
  let totalRows = 0;

  for (const file of files) {
    if (file?.id == null) continue;
    const stored = await getByIndex('sales_rows', 'fileId', file.id);
    if (!stored || stored.length === 0) continue;

    // 콤보 가상 행 제외 후 originalIndex 순으로 원본 행 재구성
    const sourceRows = stored
      .filter(r => !isComboVirtualRow(r))
      .sort((a, b) => (a.originalIndex ?? 0) - (b.originalIndex ?? 0))
      .map(r => ({
        rawMenuName:   r.rawMenuName,
        quantity:      r.quantity,
        originalIndex: r.originalIndex,
      }));

    if (sourceRows.length === 0) continue;

    const { classifiedRows, groupedIssues } =
      classifyAndPrepare(sourceRows, file.year, file.month, classifier);

    await replaceFileClassification(file, classifiedRows, groupedIssues);
    touchedFiles += 1;
    totalRows += classifiedRows.length;
  }

  return { files: touchedFiles, rows: totalRows };
}
