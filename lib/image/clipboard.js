export function clipboardImageFiles(clipboardData, { namePrefix = 'pasted-photo' } = {}) {
  const itemFiles = Array.from(clipboardData?.items || [])
    .filter(item => item.kind === 'file' && String(item.type || '').startsWith('image/'))
    .map((item, index) => {
      const file = item.getAsFile();
      if (!file) return null;
      if (file.name) return file;
      return new File([file], `${namePrefix}-${Date.now()}-${index + 1}.png`, {
        type: file.type || 'image/png',
      });
    })
    .filter(Boolean);

  if (itemFiles.length > 0) return itemFiles;

  return Array.from(clipboardData?.files || []).filter(file =>
    String(file?.type || '').startsWith('image/')
  );
}
