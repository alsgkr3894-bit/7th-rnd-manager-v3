export const fmtKRW = (n) => n.toLocaleString('ko-KR');
export const fmtShort = (n) => {
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '억';
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '만';
  return n.toLocaleString();
};
