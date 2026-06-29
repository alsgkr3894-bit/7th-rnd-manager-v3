import {
  buildSampleRecordsReportHtml,
  buildSampleReportSummary,
  formatSampleReportDownloadDate,
} from '@/lib/sample/report-print';

describe('sample report print helpers', () => {
  const samples = [
    {
      title: '치즈 소스 샘플',
      sampleNames: ['치즈 소스'],
      category: '소스',
      testDate: '2026-06-01',
      testRound: '2',
      company: '테스트업체',
      rating: 4,
      description: '고소함 확인',
      photos: [{ data: 'data:image/png;base64,abc', caption: '완성 사진' }],
      tags: '소스,시식',
    },
    {
      title: '',
      sampleNames: ['멘보샤'],
      category: '',
      testDate: '2026-06-02',
      rating: 0,
      photos: [],
    },
  ];

  test('buildSampleReportSummary counts samples, photos, ratings, categories, and companies', () => {
    const summary = buildSampleReportSummary(samples);

    expect(summary.total).toBe(2);
    expect(summary.titleCount).toBe(2);
    expect(summary.photoCount).toBe(1);
    expect(summary.ratedCount).toBe(1);
    expect(summary.categoryCounts).toContainEqual(['소스', 1]);
    expect(summary.categoryCounts).toContainEqual(['미지정', 1]);
    expect(summary.ratingCounts).toContainEqual(['4점', 1]);
    expect(summary.ratingCounts).toContainEqual(['미평가', 1]);
    expect(summary.companyCounts).toContainEqual(['테스트업체', 1]);
  });

  test('buildSampleRecordsReportHtml renders PDF report with download date and uncropped photos', () => {
    const html = buildSampleRecordsReportHtml(samples, {
      now: new Date(2026, 5, 29),
      scopeLabel: '현재 필터 결과',
    });

    expect(html).toContain('샘플기록 PDF 보고서');
    expect(html).toContain('다운로드일 2026-06-29');
    expect(html).toContain('현재 필터 결과');
    expect(html).toContain('치즈 소스 샘플');
    expect(html).toContain('멘보샤');
    expect(html).toContain('object-fit: contain');
    expect(html).toContain('data:image/png;base64,abc');
  });

  test('formatSampleReportDownloadDate falls back to current date for invalid input', () => {
    expect(formatSampleReportDownloadDate(new Date('2026-06-29T12:00:00'))).toBe('2026-06-29');
    expect(formatSampleReportDownloadDate(new Date('invalid'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
