const FAILED_RESOURCE_404 =
  /^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/;

export function resourcePathOf(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return String(url || '');
  }
}

export function isNextStaticAsset404(url, status) {
  return status === 404 && resourcePathOf(url).startsWith('/_next/static/');
}

export function splitConsoleErrors(errors, { ignorableNextStatic404Count = 0 } = {}) {
  let remainingStatic404 = ignorableNextStatic404Count;
  const relevant = [];
  const ignored = [];

  for (const error of errors || []) {
    const message = String(error || '');
    if (remainingStatic404 > 0 && FAILED_RESOURCE_404.test(message)) {
      ignored.push(message);
      remainingStatic404 -= 1;
      continue;
    }
    relevant.push(message);
  }

  return { relevant, ignored };
}

export function isSmokePass(row) {
  return (
    !row.fatal &&
    row.h1 &&
    row.main &&
    !row.overflow &&
    !row.loading &&
    !row.errText &&
    row.errs === 0
  );
}

export const cell = value => (value ? 'Y' : '·');
