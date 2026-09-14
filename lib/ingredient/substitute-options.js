/**
 * lib/ingredient/substitute-options.js — 대체 식자재 후보 라벨링 공용 로직
 *
 * DB 접근 없는 순수 함수. SubstituteLinkModal(수정 중이 아닌 항목의 대체 연결)과
 * IngredientReplacementField(수정 폼에서 단종 체크 시 대체 지정)가 같은 후보 목록을
 * 같은 방식으로 라벨링하도록 공유한다 — 검색어/선택값이 두 곳에서 다르게 보이면 혼란스럽다.
 */

export function substituteRowLabel(row) {
  return row?.ingredientName || row?.displayName || row?.productName || row?.productCode || '';
}

export function substituteRowCode(row) {
  return String(row?.productCode || '').trim();
}

export function substituteOptionLabel(row) {
  const label = substituteRowLabel(row);
  const code = substituteRowCode(row);
  if (!label && !code) return '';
  if (!code) return label;
  return `${label} (${code})`;
}

/**
 * 대체 후보 목록을 만든다 — 자기 자신, 코드 없는 행, 이미 단종/숨김된 행은 제외하고
 * 이름 가나다순 정렬.
 * @param {object[]} candidates
 * @param {string} sourceProductCode 대체될(제외할) 원본 제품코드
 */
export function buildSubstituteOptions(candidates, sourceProductCode) {
  const sourceCode = substituteRowCode({ productCode: sourceProductCode });
  return (candidates || [])
    .filter(
      row =>
        substituteRowCode(row) &&
        substituteRowCode(row) !== sourceCode &&
        !row.discontinued &&
        !row.excluded
    )
    .sort((a, b) => substituteRowLabel(a).localeCompare(substituteRowLabel(b), 'ko'));
}

/** ComboBox 입력값(라벨 문자열)로부터 원본 후보 행을 되찾는다. */
export function findSubstituteByLabel(options, label) {
  const target = String(label || '').trim();
  if (!target) return null;
  return (options || []).find(option => substituteOptionLabel(option) === target) || null;
}
